const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

// Start a new workout session
const startSession = async (req, res) => {
  try {
    const { workoutDayId, notes, location, bodyWeight } = req.body;
    const userId = 1; // Hardcoded for now
    
    const session = await prisma.session.create({
      data: {
        userId,
        workoutDayId: workoutDayId || null, // Optional - can log freestyle workouts
        notes,
        location,
        bodyWeight
      },
      include: {
        workoutDay: {
          include: {
            dayExercises: {
              include: {
                exercise: true
              },
              orderBy: {
                order: 'asc'
              }
            }
          }
        }
      }
    });
    
    res.status(201).json(session);
  } catch (error) {
    console.error('Error starting session:', error);
    res.status(500).json({ error: 'Failed to start session' });
  }
};

// Log a set during the workout
// Log a set during the workout
const logSet = async (req, res) => {
    try {
        const { id } = req.params;
        const sessionId = id;     
        const { exerciseId, setNumber, reps, weight, duration, distance, restTime, rpe, notes } = req.body;
      
      // Make sure sessionId is a valid number
      const sessionIdNum = parseInt(sessionId);
      if (isNaN(sessionIdNum)) {
        return res.status(400).json({ error: 'Invalid session ID' });
      }
      
      const setLog = await prisma.setLog.create({
        data: {
          sessionId: sessionIdNum,
          exerciseId: parseInt(exerciseId),
          setNumber: parseInt(setNumber),
          reps: reps ? parseInt(reps) : null,
          weight: weight ? parseFloat(weight) : null,
          duration: duration ? parseInt(duration) : null,
          distance: distance ? parseFloat(distance) : null,
          restTime: restTime ? parseInt(restTime) : null,
          rpe: rpe ? parseInt(rpe) : null,
          notes
        },
        include: {
          exercise: true
        }
      });
      
      res.status(201).json(setLog);
    } catch (error) {
      console.error('Error logging set:', error);
      res.status(500).json({ error: 'Failed to log set' });
    }
  };

// Get session with all logged sets
const getSession = async (req, res) => {
  try {
    const { id } = req.params;
    
    const session = await prisma.session.findUnique({
      where: { id: parseInt(id) },
      include: {
        workoutDay: true,
        setLogs: {
          include: {
            exercise: true
          },
          orderBy: [
            { exerciseId: 'asc' },
            { setNumber: 'asc' }
          ]
        }
      }
    });
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    res.json(session);
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
};

// Complete a session (set end time and duration)
const completeSession = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    
    const session = await prisma.session.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    const endTime = new Date();
    const duration = Math.round((endTime - session.startTime) / (1000 * 60)); // minutes
    
    const updatedSession = await prisma.session.update({
      where: { id: parseInt(id) },
      data: {
        endTime,
        duration,
        notes: notes || session.notes
      },
      include: {
        setLogs: {
          include: {
            exercise: true
          }
        }
      }
    });
    
    res.json(updatedSession);
  } catch (error) {
    console.error('Error completing session:', error);
    res.status(500).json({ error: 'Failed to complete session' });
  }
};

// Get all sessions for user
const getUserSessions = async (req, res) => {
  try {
    const userId = 1; // Hardcoded for now
    
    const sessions = await prisma.session.findMany({
      where: { userId },
      include: {
        workoutDay: true,
        setLogs: {
          include: {
            exercise: true
          }
        }
      },
      orderBy: {
        startTime: 'desc'
      }
    });
    
    res.json(sessions);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
};

module.exports = {
  startSession,
  logSet,
  getSession,
  completeSession,
  getUserSessions
};