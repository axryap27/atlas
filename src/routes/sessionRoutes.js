const express = require('express');
const router = express.Router();
const { 
  startSession, 
  logSet, 
  getSession, 
  completeSession, 
  getUserSessions 
} = require('../controllers/sessionController');

// GET /api/sessions - Get all user sessions
router.get('/', getUserSessions);

// POST /api/sessions - Start new workout session
router.post('/', startSession);

// GET /api/sessions/:id - Get specific session with all sets
router.get('/:id', getSession);

// PUT /api/sessions/:id/complete - Mark session as complete
router.put('/:id/complete', completeSession);

// POST /api/sessions/:id/sets - Log a set during workout
router.post('/:id/sets', logSet);

module.exports = router;