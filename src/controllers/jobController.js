// src/controllers/jobController.js
const asyncHandler = require('../utils/asyncHandler');
const { triggerDecayManually, getQueueStatus } = require('../workers/scheduler');

const triggerDecay = asyncHandler(async (req, res) => {
  const result = await triggerDecayManually(req.user.tenantId);
  res.json(result);
});

const getQueueStatusController = asyncHandler(async (req, res) => {
  const status = await getQueueStatus();
  res.json(status);
});

module.exports = { triggerDecay, getQueueStatusController };