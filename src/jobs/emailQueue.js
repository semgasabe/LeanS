// src/jobs/emailQueue.js
const { Queue, Worker } = require('bullmq');
const redis = require('../config/redis');
const nodemailer = require('nodemailer');

// Настройка реального email транспортера
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const emailQueue = new Queue('email-queue', { connection: redis });

const emailWorker = new Worker('email-queue', async (job) => {
  const { type, email, token, name } = job.data;
  
  console.log(`📧 Sending email to ${email} (${type})`);
  
  if (type === 'send-verification') {
    const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify?token=${token}`;
    
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@leanstock.com',
      to: email,
      subject: 'Verify Your Email - LeanStock',
      html: `
        <h1>Welcome ${name}!</h1>
        <p>Please verify your email by clicking the link below:</p>
        <a href="${verifyUrl}">${verifyUrl}</a>
        <p>This link expires in 24 hours.</p>
        <hr>
        <p>Or copy this token: <strong>${token}</strong></p>
      `,
    });
    
    console.log(`✅ Verification email sent to ${email}`);
  }
  
  if (type === 'send-password-reset') {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
    
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@leanstock.com',
      to: email,
      subject: 'Reset Your Password - LeanStock',
      html: `
        <h1>Hello ${name}!</h1>
        <p>Click the link below to reset your password:</p>
        <a href="${resetUrl}">${resetUrl}</a>
        <p>This link expires in 1 hour.</p>
        <hr>
        <p>Or copy this token: <strong>${token}</strong></p>
        <p>If you didn't request this, ignore this email.</p>
      `,
    });
    
    console.log(`✅ Password reset email sent to ${email}`);
  }
  
  return { success: true };
}, { connection: redis });

emailWorker.on('completed', (job) => {
  console.log(`✅ Email job ${job.id} completed`);
});

emailWorker.on('failed', (job, err) => {
  console.error(`❌ Email job ${job.id} failed:`, err.message);
});

module.exports = { emailQueue, emailWorker };