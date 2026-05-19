const { Queue } = require('bullmq');
const redis = require('../config/redis');

let decayQueue = null;

if (redis) {
  decayQueue = new Queue('decay-queue', { connection: redis });
}

async function scheduleDecayJobs() {
  if (!decayQueue) {
    console.warn('[Decay] Queue disabled — Redis unavailable');
    return;
  }

  await decayQueue.add(
    'decay-all-tenants',
    { tenantId: 1 },
    {
      repeat: { pattern: '0 */72 * * *' },
      jobId: 'scheduled-decay',
    }
  );
  console.log('[Decay] Scheduled every 72 hours');
}

async function triggerDecayManually(tenantId = 1) {
  if (!decayQueue) {
    const err = new Error('Decay queue unavailable (Redis not connected)');
    err.status = 503;
    throw err;
  }
  const job = await decayQueue.add('manual-decay', { tenantId });
  return { message: 'Decay job triggered', jobId: job.id };
}

async function getQueueStatus() {
  if (!decayQueue) {
    return { waiting: 0, active: 0, completed: 0, failed: 0, redis: false };
  }
  const waiting = await decayQueue.getWaitingCount();
  const active = await decayQueue.getActiveCount();
  const completed = await decayQueue.getCompletedCount();
  const failed = await decayQueue.getFailedCount();
  return { waiting, active, completed, failed, redis: true };
}

module.exports = { scheduleDecayJobs, triggerDecayManually, getQueueStatus };
