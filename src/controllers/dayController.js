const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

// Get all workout days for a specific user
const getWorkoutDays = async (req, res) => {
  try {
    const userId = req.user?.id || 1; // Get from authenticated user, fallback to 1 for now
    
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

// Get only templates (isTemplate: true) for the specific user
const getTemplates = async (req, res) => {
  try {
    const userId = req.user?.id || 1; // Get from authenticated user, fallback to 1 for now
    
    const templates = await prisma.workoutDay.findMany({
      where: { 
        userId,
        isTemplate: true 
      },
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
    
    res.json(templates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
};

// Create a new workout day with exercises for the user
const createWorkoutDay = async (req, res) => {
  try {
    const { name, description, exercises, isTemplate = true } = req.body;
    const userId = req.user?.id || 1; // Get from authenticated user, fallback to 1 for now
    
    const workoutDay = await prisma.workoutDay.create({
      data: {
        name,
        description,
        userId,
        isTemplate,
        dayExercises: {
          create: exercises.map((exercise, index) => ({
            exerciseId: exercise.exerciseId,
            targetSets: exercise.targetSets,
            targetReps: exercise.targetReps,
            targetWeight: exercise.targetWeight,
            targetTime: exercise.targetTime,
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

// Create a new template specifically for the user
const createTemplate = async (req, res) => {
  try {
    const { name, description, exercises } = req.body;
    const userId = req.user?.id || 1; // Get from authenticated user, fallback to 1 for now
    
    // Validate required fields
    if (!name || !exercises || exercises.length === 0) {
      return res.status(400).json({ 
        error: 'Template name and at least one exercise are required' 
      });
    }
    
    const template = await prisma.workoutDay.create({
      data: {
        name,
        description,
        userId,
        isTemplate: true,
        dayExercises: {
          create: exercises.map((exercise, index) => ({
            exerciseId: exercise.exerciseId,
            targetSets: exercise.targetSets || 3,
            targetReps: exercise.targetReps,
            targetWeight: exercise.targetWeight,
            targetTime: exercise.targetTime,
            restTime: exercise.restTime || 60,
            order: index + 1,
            notes: exercise.notes
          }))
        }
      },
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
    
    res.status(201).json(template);
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: 'Failed to create template' });
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

// Delete a user's template
const deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || 1; // Get from authenticated user, fallback to 1 for now
    
    // Check if template exists and belongs to user
    const template = await prisma.workoutDay.findFirst({
      where: {
        id: parseInt(id),
        userId,
        isTemplate: true
      }
    });
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    // Delete template (cascade will handle dayExercises)
    await prisma.workoutDay.delete({
      where: { id: parseInt(id) }
    });
    
    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
};

module.exports = {
  getWorkoutDays,
  getTemplates,
  createWorkoutDay,
  createTemplate,
  getWorkoutDayById,
  deleteTemplate
};