const { Worker } = require('bullmq');
const redis = require('../config/redis');
const prisma = require('../config/database');

let decayWorker = null;

if (redis) {
  decayWorker = new Worker('decay-queue', async (job) => {
    const { tenantId } = job.data;

    console.log(`[Decay] Running for tenant ${tenantId}`);

    const thresholdDays = parseInt(process.env.DECAY_THRESHOLD_DAYS, 10) || 30;
    const decayPercent = parseInt(process.env.DECAY_PERCENT, 10) || 10;
    const maxPercent = parseInt(process.env.DECAY_MAX_PERCENT, 10) || 50;

    const oldInventory = await prisma.inventory.findMany({
      where: {
        tenantId,
        daysInInventory: { gt: thresholdDays },
        discountPct: { lt: maxPercent },
      },
      include: { product: true },
    });

    for (const item of oldInventory) {
      const newDiscount = Math.min(item.discountPct + decayPercent, maxPercent);
      await prisma.inventory.update({
        where: { id: item.id },
        data: { discountPct: newDiscount },
      });
    }

    return { processed: oldInventory.length };
  }, { connection: redis });

  decayWorker.on('completed', (job) => {
    console.log(`[Decay] Job ${job.id} completed`);
  });

  decayWorker.on('failed', (job, err) => {
    console.error(`[Decay] Job ${job?.id} failed:`, err.message);
  });
}

module.exports = { decayWorker };
