const { Queue, Worker } = require('bullmq');
const redis = require('../config/redis');
const { transporter, EMAIL_FROM } = require('../config/email');
const { FRONTEND_URL } = require('../config/env');

const noopQueue = {
  add: async () => ({ id: 'noop' }),
};

let emailQueue = noopQueue;
let emailWorker = null;

async function sendMail(options) {
  await transporter.sendMail({
    from: EMAIL_FROM,
    ...options,
  });
}

async function processEmailJob(job) {
  const { type, email, name } = job.data;
  console.log(`[Email] Processing ${type} for ${email}`);

  if (type === 'send-verification') {
    const { token } = job.data;
    const verifyUrl = `${FRONTEND_URL}/verify?token=${token}`;
    await sendMail({
      to: email,
      subject: 'Verify Your Email - LeanStock',
      html: `
        <h1>Welcome ${name}!</h1>
        <p>Please verify your email:</p>
        <a href="${verifyUrl}">${verifyUrl}</a>
        <p>This link expires in 24 hours.</p>
        <p>Token: <strong>${token}</strong></p>
      `,
    });
  }

  if (type === 'send-password-reset') {
    const { token } = job.data;
    const resetUrl = `${FRONTEND_URL}/reset-password?token=${token}`;
    await sendMail({
      to: email,
      subject: 'Reset Your Password - LeanStock',
      html: `
        <h1>Hello ${name}!</h1>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>Expires in 1 hour. Ignore if you did not request this.</p>
      `,
    });
  }

  if (type === 'low-stock-alert') {
    const { productName, sku, locationName, quantity, minQuantity } = job.data;
    await sendMail({
      to: email,
      subject: `Low Stock Alert: ${productName}`,
      html: `
        <h1>Low Stock Alert</h1>
        <p>Hello ${name},</p>
        <p><strong>${productName}</strong> (${sku}) at <strong>${locationName}</strong>
           is at or below minimum stock.</p>
        <ul>
          <li>Current quantity: <strong>${quantity}</strong></li>
          <li>Minimum quantity: <strong>${minQuantity}</strong></li>
        </ul>
        <p>Please review inventory and create a purchase order if needed.</p>
      `,
    });
  }

  if (type === 'transfer-receipt') {
    const { productName, quantity, fromLocation, toLocation } = job.data;
    await sendMail({
      to: email,
      subject: 'Inventory Transfer Receipt - LeanStock',
      html: `
        <h1>Transfer Completed</h1>
        <p>Hello ${name},</p>
        <p><strong>${quantity}</strong> units of <strong>${productName}</strong></p>
        <p>From: ${fromLocation}</p>
        <p>To: ${toLocation}</p>
        <p>Status: completed successfully.</p>
      `,
    });
  }

  if (type === 'purchase-order-confirmation') {
    const { orderId, supplier, status, items } = job.data;
    const itemsHtml = items
      .map(
        (i) =>
          `<li>${i.productName} (${i.sku}) — qty ${i.quantity}, unit price ${i.unitPrice}</li>`
      )
      .join('');
    await sendMail({
      to: email,
      subject: `Purchase Order Confirmation #${orderId.slice(0, 8)}`,
      html: `
        <h1>Purchase Order Created</h1>
        <p>Hello ${name},</p>
        <p>Order <strong>${orderId}</strong> for supplier <strong>${supplier}</strong> (${status}).</p>
        <ul>${itemsHtml}</ul>
      `,
    });
  }

  return { success: true };
}

if (redis) {
  emailQueue = new Queue('email-queue', { connection: redis });
  emailWorker = new Worker('email-queue', processEmailJob, { connection: redis });

  emailWorker.on('completed', (job) => {
    console.log(`[Email] Job ${job.id} completed`);
  });

  emailWorker.on('failed', (job, err) => {
    console.error(`[Email] Job ${job?.id} failed:`, err.message);
  });
} else {
  console.warn('[Email] Redis unavailable — email queue worker disabled');
}

module.exports = { emailQueue, emailWorker };
