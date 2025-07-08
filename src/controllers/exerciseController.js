const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all exercises
const getAllExercises = async (req, res) => {
  try {
    const exercises = await prisma.exercise.findMany({
      orderBy: {
        name: 'asc'
      }
    });
    
    res.json(exercises);
  } catch (error) {
    console.error('Error fetching exercises:', error);
    res.status(500).json({ error: 'Failed to fetch exercises' });
  }
};

// Create a new exercise
const createExercise = async (req, res) => {
  try {
    const { name, description, category, muscleGroup, equipment } = req.body;
    
    const exercise = await prisma.exercise.create({
      data: {
        name,
        description,
        category,
        muscleGroup,
        equipment
      }
    });
    
    res.status(201).json(exercise);
  } catch (error) {
    console.error('Error creating exercise:', error);
    res.status(500).json({ error: 'Failed to create exercise' });
  }
};

module.exports = {
  getAllExercises,
  createExercise
};

// Delete exercise
const deleteExercise = async (req, res) => {
  try {
    const { id } = req.params;
    
    const deletedExercise = await prisma.exercise.delete({
      where: { id: parseInt(id) }
    });
    
    res.json({ message: 'Exercise deleted successfully', exercise: deletedExercise });
  } catch (error) {
    console.error('Error deleting exercise:', error);
    res.status(500).json({ error: 'Failed to delete exercise' });
  }
};

module.exports = {
  getAllExercises,
  createExercise,
  deleteExercise  // Add this export
};