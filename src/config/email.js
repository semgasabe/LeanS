const nodemailer = require('nodemailer');
const {
  EMAIL_HOST,
  EMAIL_PORT,
  EMAIL_USER,
  EMAIL_PASS,
  EMAIL_FROM,
} = require('./env');

const transporter = nodemailer.createTransport({
  host: EMAIL_HOST,
  port: EMAIL_PORT,
  secure: EMAIL_PORT === 465,
  auth: EMAIL_USER && EMAIL_PASS
    ? { user: EMAIL_USER, pass: EMAIL_PASS }
    : undefined,
});

async function verifySmtpConnection() {
  if (!EMAIL_USER || !EMAIL_PASS) {
    console.warn('[Email] EMAIL_USER or EMAIL_PASS not set — SMTP verify skipped');
    return false;
  }

  try {
    await transporter.verify();
    console.log('[Email] SMTP connection verified successfully');
    return true;
  } catch (err) {
    console.error('[Email] SMTP connection failed:', err.message);
    return false;
  }
}

module.exports = { transporter, verifySmtpConnection, EMAIL_FROM };
