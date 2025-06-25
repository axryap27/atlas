const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

// Get all workout days for a user
const getWorkoutDays = async (req, res) => {
  try {
    const userId = 1; // Hardcoded for now
    
    const workoutDays = await prisma.workoutDay.findMany({
      where: { userId },
      include: {
        dayExercises: {
          include: {
            exercise: true
          },
          orderBy: {
            order: 'asc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    res.json(workoutDays);
  } catch (error) {
    console.error('Error fetching workout days:', error);
    res.status(500).json({ error: 'Failed to fetch workout days' });
  }
};

// Create a new workout day with exercises
const createWorkoutDay = async (req, res) => {
  try {
    const { name, description, exercises } = req.body;
    const userId = 1; // Hardcoded for now
    
    const workoutDay = await prisma.workoutDay.create({
      data: {
        name,
        description,
        userId,
        dayExercises: {
          create: exercises.map((exercise, index) => ({
            exerciseId: exercise.exerciseId,
            targetSets: exercise.targetSets,
            targetReps: exercise.targetReps,
            targetWeight: exercise.targetWeight,
            restTime: exercise.restTime,
            order: index + 1,
            notes: exercise.notes
          }))
        }
      },
      include: {
        dayExercises: {
          include: {
            exercise: true
          }
        }
      }
    });
    
    res.status(201).json(workoutDay);
  } catch (error) {
    console.error('Error creating workout day:', error);
    res.status(500).json({ error: 'Failed to create workout day' });
  }
};

// Get a specific workout day by ID
const getWorkoutDayById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const workoutDay = await prisma.workoutDay.findUnique({
      where: { id: parseInt(id) },
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
    });
    
    if (!workoutDay) {
      return res.status(404).json({ error: 'Workout day not found' });
    }
    
    res.json(workoutDay);
  } catch (error) {
    console.error('Error fetching workout day:', error);
    res.status(500).json({ error: 'Failed to fetch workout day' });
  }
};

module.exports = {
  getWorkoutDays,
  createWorkoutDay,
  getWorkoutDayById
};