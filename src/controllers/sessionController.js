// controllers/sessionController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const sessionController = {
  // Create a new workout session
  createSession: async (req, res) => {
    try {
      const { userId, workoutDayId, startTime, notes, location, bodyWeight } = req.body;

      if (!userId) {
        return res.status(400).json({ 
          error: 'userId is required' 
        });
      }

      const session = await prisma.session.create({
        data: {
          userId: parseInt(userId),
          workoutDayId: workoutDayId ? parseInt(workoutDayId) : null,
          startTime: startTime ? new Date(startTime) : new Date(),
          notes,
          location,
          bodyWeight: bodyWeight ? parseFloat(bodyWeight) : null,
        },
        include: {
          workoutDay: {
            select: {
              id: true,
              name: true,
              description: true,
            }
          }
        }
      });

      res.status(201).json(session);
    } catch (error) {
      console.error('Error creating session:', error);
      res.status(500).json({ 
        error: 'Failed to create session',
        details: error.message 
      });
    }
  },

  // Finish/update a session
  updateSession: async (req, res) => {
    try {
      const { id } = req.params;
      const { endTime, duration, notes, location, bodyWeight } = req.body;

      const session = await prisma.session.update({
        where: { id: parseInt(id) },
        data: {
          endTime: endTime ? new Date(endTime) : new Date(),
          duration: duration ? parseInt(duration) : null,
          notes,
          location,
          bodyWeight: bodyWeight ? parseFloat(bodyWeight) : null,
        },
        include: {
          workoutDay: {
            select: {
              id: true,
              name: true,
              description: true,
            }
          },
          setLogs: {
            include: {
              exercise: {
                select: {
                  id: true,
                  name: true,
                  muscleGroup: true,
                }
              }
            },
            orderBy: [
              { exerciseId: 'asc' },
              { setNumber: 'asc' }
            ]
          }
        }
      });

      res.json(session);
    } catch (error) {
      console.error('Error updating session:', error);
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Session not found' });
      }
      res.status(500).json({ 
        error: 'Failed to update session',
        details: error.message 
      });
    }
  },

  // Get recent sessions for a user
  getRecentSessions: async (req, res) => {
    try {
      const { userId, limit = 10 } = req.query;

      if (!userId) {
        return res.status(400).json({ 
          error: 'userId is required' 
        });
      }

      const sessions = await prisma.session.findMany({
        where: {
          userId: parseInt(userId)
        },
        include: {
          workoutDay: {
            select: {
              id: true,
              name: true,
              description: true,
            }
          },
          setLogs: {
            include: {
              exercise: {
                select: {
                  id: true,
                  name: true,
                  muscleGroup: true,
                }
              }
            },
            orderBy: [
              { exerciseId: 'asc' },
              { setNumber: 'asc' }
            ]
          }
        },
        orderBy: {
          startTime: 'desc'
        },
        take: parseInt(limit)
      });

      res.json(sessions);
    } catch (error) {
      console.error('Error fetching recent sessions:', error);
      res.status(500).json({ 
        error: 'Failed to fetch recent sessions',
        details: error.message 
      });
    }
  },

  // Get a specific session by ID
  getSessionById: async (req, res) => {
    try {
      const { id } = req.params;

      const session = await prisma.session.findUnique({
        where: { id: parseInt(id) },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          },
          workoutDay: {
            select: {
              id: true,
              name: true,
              description: true,
            }
          },
          setLogs: {
            include: {
              exercise: {
                select: {
                  id: true,
                  name: true,
                  muscleGroup: true,
                  category: true,
                  equipment: true,
                }
              }
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
      res.status(500).json({ 
        error: 'Failed to fetch session',
        details: error.message 
      });
    }
  },

  // Delete a session
  // Add this to your sessionController.js file
  deleteSession: async (req, res) => {
    try {
      const { id } = req.params;
      
      const session = await prisma.session.findUnique({
        where: { id: parseInt(id) }
      });
      
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }
      
      await prisma.session.delete({
        where: { id: parseInt(id) }
      });
      
      res.json({ message: 'Session deleted successfully' });
    } catch (error) {
      console.error('Error deleting session:', error);
      res.status(500).json({ error: 'Failed to delete session' });
    }
  },

  // Log a set to a session
  logSet: async (req, res) => {
    try {
      const { id } = req.params;
      const { exerciseId, setNumber, reps, weight, notes } = req.body;

      if (!exerciseId || !setNumber || !reps) {
        return res.status(400).json({ 
          error: 'exerciseId, setNumber, and reps are required' 
        });
      }

      // Verify the session exists
      const session = await prisma.session.findUnique({
        where: { id: parseInt(id) }
      });

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Create the set log
      const setLog = await prisma.setLog.create({
        data: {
          sessionId: parseInt(id),
          exerciseId: parseInt(exerciseId),
          setNumber: parseInt(setNumber),
          reps: parseInt(reps),
          weight: weight ? parseFloat(weight) : null,
          notes,
        },
        include: {
          exercise: {
            select: {
              id: true,
              name: true,
              muscleGroup: true,
            }
          }
        }
      });

      res.status(201).json(setLog);
    } catch (error) {
      console.error('Error logging set:', error);
      res.status(500).json({ 
        error: 'Failed to log set',
        details: error.message 
      });
    }
  },

  // Get user's workout statistics
  getUserStats: async (req, res) => {
    try {
      const { userId } = req.params;
      const { startDate, endDate } = req.query;

      if (!userId) {
        return res.status(400).json({ 
          error: 'userId is required' 
        });
      }

      const whereClause = {
        userId: parseInt(userId),
        endTime: { not: null } // Only completed sessions
      };

      if (startDate && endDate) {
        whereClause.startTime = {
          gte: new Date(startDate),
          lte: new Date(endDate)
        };
      }

      const [totalSessions, totalDuration, totalVolume] = await Promise.all([
        // Total completed sessions
        prisma.session.count({
          where: whereClause
        }),

        // Total workout duration
        prisma.session.aggregate({
          where: whereClause,
          _sum: {
            duration: true
          }
        }),

        // Total volume (weight * reps)
        prisma.setLog.aggregate({
          where: {
            session: {
              userId: parseInt(userId),
              endTime: { not: null }
            },
            weight: { not: null },
            reps: { not: null }
          },
          _sum: {
            weight: true,
            reps: true
          }
        })
      ]);

      // Calculate total volume
      const sessionsWithSetLogs = await prisma.session.findMany({
        where: whereClause,
        include: {
          setLogs: {
            where: {
              weight: { not: null },
              reps: { not: null }
            }
          }
        }
      });

      let calculatedVolume = 0;
      sessionsWithSetLogs.forEach(session => {
        session.setLogs.forEach(setLog => {
          if (setLog.weight && setLog.reps) {
            calculatedVolume += setLog.weight * setLog.reps;
          }
        });
      });

      res.json({
        totalSessions,
        totalDuration: totalDuration._sum.duration || 0,
        totalVolume: calculatedVolume,
        averageDuration: totalSessions > 0 
          ? Math.round((totalDuration._sum.duration || 0) / totalSessions) 
          : 0
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
      res.status(500).json({ 
        error: 'Failed to fetch user stats',
        details: error.message 
      });
    }
  }
};

module.exports = sessionController;