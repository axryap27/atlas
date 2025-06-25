const express = require('express');
const router = express.Router();
const { getWorkoutDays, createWorkoutDay, getWorkoutDayById } = require('../controllers/dayController');

// GET /api/days - Get all workout days
router.get('/', getWorkoutDays);

// POST /api/days - Create new workout day
router.post('/', createWorkoutDay);

// GET /api/days/:id - Get specific workout day
router.get('/:id', getWorkoutDayById);

module.exports = router;