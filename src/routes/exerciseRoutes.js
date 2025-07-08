const express = require('express');
const router = express.Router();
const { getAllExercises, createExercise, deleteExercise } = require('../controllers/exerciseController');

// GET /api/exercises - Get all exercises
router.get('/', getAllExercises);

// POST /api/exercises - Create new exercise
router.post('/', createExercise);

module.exports = router;

// exercise deletion
router.delete('/:id', deleteExercise);