// src/jobs/deadStockDecay.js
// COMPLEXITY_REQ_2: Dead stock decay - runs every 72 hours
// Finds items sitting in inventory longer than DECAY_THRESHOLD_DAYS
// and applies a configurable discount (default 10%) up to DECAY_MAX_PERCENT (default 50%)
const cron = require('node-cron');
const prisma = require('../config/database');
const { DECAY_THRESHOLD_DAYS, DECAY_PERCENT, DECAY_MAX_PERCENT } = require('../config/env');

async function runDeadStockDecay() {
  console.log('[DeadStockDecay] Starting decay job...');

  try {
    // Find all items that are dead stock and haven't hit the max discount yet
    const deadItems = await prisma.inventory.findMany({
      where: {
        daysInInventory: { gt: DECAY_THRESHOLD_DAYS },
        discountPct: { lt: DECAY_MAX_PERCENT },
        quantity: { gt: 0 },
      },
      select: { id: true, discountPct: true, tenantId: true },
    });

    if (deadItems.length === 0) {
      console.log('[DeadStockDecay] No dead stock found.');
      return;
    }

    let updated = 0;

    // Update each item's discount in a transaction for atomicity
    await prisma.$transaction(async (tx) => {
      for (const item of deadItems) {
        const newDiscount = Math.min(item.discountPct + DECAY_PERCENT, DECAY_MAX_PERCENT);
        await tx.inventory.update({
          where: { id: item.id },
          data: { discountPct: newDiscount },
        });
        updated++;
      }
    });

    console.log(`[DeadStockDecay] Applied ${DECAY_PERCENT}% discount to ${updated} items.`);
  } catch (err) {
    console.error('[DeadStockDecay] Job failed:', err.message);
  }
}

// Also increment daysInInventory every day
async function incrementDays() {
  await prisma.inventory.updateMany({
    where: { quantity: { gt: 0 } },
    data: { daysInInventory: { increment: 1 } },
  });
}

function startDecayJob() {
  // Run decay every 72 hours (at midnight every 3rd day)
  cron.schedule('0 0 */3 * *', () => {
    runDeadStockDecay();
  });

  // Increment day counter every day at midnight
  cron.schedule('0 0 * * *', () => {
    incrementDays();
  });

  console.log('[DeadStockDecay] Cron jobs scheduled (decay every 72h, day counter every 24h)');
}

module.exports = { startDecayJob, runDeadStockDecay };
