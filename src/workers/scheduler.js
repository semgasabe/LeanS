// src/workers/scheduler.js
const { Queue } = require('bullmq');
const redis = require('../config/redis');

const decayQueue = new Queue('decay-queue', { connection: redis });

async function scheduleDecayJobs() {
  // Schedule every 72 hours
  await decayQueue.add('decay-all-tenants', 
    { tenantId: 1 },
    { 
      repeat: { pattern: '0 */72 * * *' },
      jobId: 'scheduled-decay',
    }
  );
  console.log('⏰ Dead stock decay job scheduled every 72 hours');
}

async function triggerDecayManually(tenantId = 1) {
  const job = await decayQueue.add('manual-decay', { tenantId });
  return { message: 'Decay job triggered', jobId: job.id };
}

async function getQueueStatus() {
  const waiting = await decayQueue.getWaitingCount();
  const active = await decayQueue.getActiveCount();
  const completed = await decayQueue.getCompletedCount();
  const failed = await decayQueue.getFailedCount();
  
  return { waiting, active, completed, failed };
}

module.exports = { scheduleDecayJobs, triggerDecayManually, getQueueStatus };