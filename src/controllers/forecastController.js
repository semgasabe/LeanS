const { z } = require('zod');
const asyncHandler = require('../utils/asyncHandler');
const { getSalesForecast } = require('../services/forecastService');

const getForecast = asyncHandler(async (req, res) => {
  const query = z.object({
    productId: z.string().min(1),
    days: z.coerce.number().int().positive().default(30),
  }).parse(req.query);

  const forecast = await getSalesForecast(
    query.productId,
    req.user.tenantId,
    query.days
  );

  res.json(forecast);
});

module.exports = { getForecast };
