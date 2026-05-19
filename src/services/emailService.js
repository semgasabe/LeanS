const { transporter, EMAIL_FROM } = require('../config/email');

async function sendVerificationEmail(email, token, name) {
  const verifyUrl = `${process.env.FRONTEND_URL}/verify?token=${token}`;
  
  await transporter.sendMail({
    from: EMAIL_FROM,
    to: email,
    subject: 'Verify Your Email - LeanStock',
    html: `
      <h1>Welcome ${name}!</h1>
      <p>Please verify your email by clicking the link below:</p>
      <a href="${verifyUrl}">${verifyUrl}</a>
      <p>This link expires in 24 hours.</p>
    `,
  });
}

async function sendPasswordResetEmail(email, token, name) {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
  
  await transporter.sendMail({
    from: EMAIL_FROM,
    to: email,
    subject: 'Reset Your Password - LeanStock',
    html: `
      <h1>Hello ${name}!</h1>
      <p>Click the link below to reset your password:</p>
      <a href="${resetUrl}">${resetUrl}</a>
      <p>This link expires in 1 hour.</p>
      <p>If you didn't request this, ignore this email.</p>
    `,
  });
}

async function sendTransferNotification(email, productName, quantity, fromLocation, toLocation) {
  await transporter.sendMail({
    from: EMAIL_FROM,
    to: email,
    subject: 'Stock Transfer Notification - LeanStock',
    html: `
      <h1>Stock Transfer Completed</h1>
      <p><strong>${quantity}</strong> units of <strong>${productName}</strong></p>
      <p>Transferred from: <strong>${fromLocation}</strong></p>
      <p>Transferred to: <strong>${toLocation}</strong></p>
      <p>Status: ✅ Completed successfully</p>
    `,
  });
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail, sendTransferNotification };