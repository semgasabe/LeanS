const prisma = require('../config/database');
const { emailQueue } = require('../jobs/emailQueue');

async function getManagerEmails(tenantId) {
  const managers = await prisma.user.findMany({
    where: { tenantId, role: 'MANAGER' },
    select: { email: true, name: true },
  });
  if (managers.length > 0) return managers;

  const admins = await prisma.user.findMany({
    where: { tenantId, role: 'ADMIN' },
    select: { email: true, name: true },
    take: 5,
  });
  return admins;
}

async function queueLowStockAlert(inventoryRecord) {
  const managers = await getManagerEmails(inventoryRecord.tenantId);
  if (!managers.length) return;

  for (const manager of managers) {
    await emailQueue.add('low-stock-alert', {
      type: 'low-stock-alert',
      email: manager.email,
      name: manager.name,
      productName: inventoryRecord.product.name,
      sku: inventoryRecord.product.sku,
      locationName: inventoryRecord.location.name,
      quantity: inventoryRecord.quantity,
      minQuantity: inventoryRecord.minQuantity,
    });
  }
}

async function queueTransferReceipt({ email, name, productName, quantity, fromLocation, toLocation }) {
  await emailQueue.add('transfer-receipt', {
    type: 'transfer-receipt',
    email,
    name,
    productName,
    quantity,
    fromLocation,
    toLocation,
  });
}

async function queuePurchaseOrderConfirmation({ order, recipientEmail, recipientName }) {
  await emailQueue.add('purchase-order-confirmation', {
    type: 'purchase-order-confirmation',
    email: recipientEmail,
    name: recipientName,
    orderId: order.id,
    supplier: order.supplier,
    status: order.status,
    items: order.items.map((item) => ({
      productName: item.product.name,
      sku: item.product.sku,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
  });
}

module.exports = {
  getManagerEmails,
  queueLowStockAlert,
  queueTransferReceipt,
  queuePurchaseOrderConfirmation,
};
