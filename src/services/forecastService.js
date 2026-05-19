const prisma = require('../config/database');

async function getSalesForecast(productId, tenantId, days = 30) {
  const product = await prisma.product.findFirst({
    where: { id: productId, tenantId },
  });
  if (!product) {
    const err = new Error('Product not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  const since = new Date();
  since.setDate(since.getDate() - days);

  const movements = await prisma.stockMovement.findMany({
    where: {
      tenantId,
      type: 'SALE',
      createdAt: { gte: since },
      inventory: { productId },
    },
    select: { quantity: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  const totalSales = movements.reduce((sum, m) => sum + m.quantity, 0);
  const daysWithSales = new Set(
    movements.map((m) => m.createdAt.toISOString().slice(0, 10))
  ).size;

  const divisor = daysWithSales > 0 ? daysWithSales : days;
  const movingAverage = totalSales / divisor;
  const recommendedOrderQuantity = Math.ceil(movingAverage * 1.2);

  return {
    productId,
    productName: product.name,
    sku: product.sku,
    periodDays: days,
    totalSales,
    daysWithSales,
    movingAverage: Number(movingAverage.toFixed(2)),
    recommendedOrderQuantity,
    formula: 'recommendedOrderQuantity = ceil(movingAverage * 1.2)',
  };
}

module.exports = { getSalesForecast };
