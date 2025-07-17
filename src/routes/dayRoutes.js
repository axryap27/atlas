const express = require('express');
const router = express.Router();
const { 
  getWorkoutDays, 
  getTemplates,
  createWorkoutDay, 
  createTemplate,
  getWorkoutDayById,
  deleteTemplate
} = require('../controllers/dayController');

// GET /api/days - Get all workout days
router.get('/', getWorkoutDays);

// GET /api/days/templates - Get only templates
router.get('/templates', getTemplates);

// POST /api/days - Create new workout day
router.post('/', createWorkoutDay);

// POST /api/days/templates - Create new template specifically
router.post('/templates', createTemplate);

// GET /api/days/:id - Get specific workout day
router.get('/:id', getWorkoutDayById);

// DELETE /api/days/templates/:id - Delete a template
router.delete('/templates/:id', deleteTemplate);

module.exports = router;