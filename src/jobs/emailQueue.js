// src/jobs/emailQueue.js
const { Queue, Worker } = require('bullmq');
const redis = require('../config/redis');

const emailQueue = new Queue('email-queue', { connection: redis });

const emailWorker = new Worker('email-queue', async (job) => {
  console.log('Job received:', job.id, job.data);
  
  // Проверяем структуру данных
  const { type, email, token, name } = job.data;
  
  if (!email) {
    console.error('❌ No email in job data:', job.data);
    return;
  }
  
  console.log('========================================');
  console.log(`📧 [DEV MODE] Email would be sent:`);
  console.log(`   Type: ${type}`);
  console.log(`   To: ${email}`);
  console.log(`   Name: ${name || 'User'}`);
  
  if (type === 'send-verification') {
    const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify?token=${token}`;
    console.log(`   Verification link: ${verifyUrl}`);
    console.log(`   🔑 TOKEN TO USE IN POSTMAN: ${token}`);
  }
  
  if (type === 'send-password-reset') {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
    console.log(`   Reset link: ${resetUrl}`);
    console.log(`   🔑 RESET TOKEN: ${token}`);
  }
  console.log('========================================');
  
  return { success: true };
}, { connection: redis });

emailWorker.on('completed', (job) => {
  console.log(`✅ Email job ${job.id} completed`);
});

emailWorker.on('failed', (job, err) => {
  console.error(`❌ Email job ${job.id} failed:`, err);
});

module.exports = { emailQueue, emailWorker };