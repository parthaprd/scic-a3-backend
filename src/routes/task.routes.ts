import { Router } from 'express';
import {
  getTasks,
  getTaskStats,
  getMyTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
} from '../controllers/task.controller';
import { protect } from '../middleware/auth.middleware';
import { validateTask } from '../middleware/validation.middleware';

const router = Router();

// Public Routes
router.get('/', getTasks);
router.get('/stats', getTaskStats);

// Protected Routes
router.get('/my', protect, getMyTasks);
router.get('/:id', protect, getTaskById);
router.post('/', protect, validateTask, createTask);
router.put('/:id', protect, validateTask, updateTask);
router.delete('/:id', protect, deleteTask);

export default router;
