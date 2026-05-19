const { z } = require('zod');
const asyncHandler = require('../utils/asyncHandler');
const { reserveStock, getReservationStatus } = require('../services/reservationService');

const createReservation = asyncHandler(async (req, res) => {
  const body = z.object({
    productId: z.string().min(1),
    quantity: z.number().int().positive(),
    ttlSeconds: z.number().int().positive().optional(),
  }).parse(req.body);

  const result = await reserveStock({
    ...body,
    tenantId: req.user.tenantId,
  });

  res.status(201).json(result);
});

const reservationStatus = asyncHandler(async (req, res) => {
  const status = await getReservationStatus(req.params.productId, req.user.tenantId);
  res.json(status);
});

module.exports = { createReservation, reservationStatus };
