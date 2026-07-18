import { Request, Response } from 'express';
import { Task } from '../models/Task';
import { User } from '../models/User';
import { AuthRequest, ITask, TaskCategory, TaskPriority, TaskStatus } from '../types';
import { isMongoConnected } from '../config/db';
import { jsonDb } from '../config/jsonDb';
import mongoose from 'mongoose';

// Helper to compute stats from a list of tasks
const calculateStats = async (tasks: any[]) => {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'completed').length;
  const avgCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Active Users: count distinct emails or ids of task creators
  const distinctUsers = new Set(tasks.map((t) => t.createdBy.email));
  const activeUsers = distinctUsers.size || 0;

  // Tasks by Category
  const categories = ['Work', 'Personal', 'Shopping', 'Health', 'Finance', 'Education', 'Other'];
  const categoryData = categories.map((cat) => {
    const count = tasks.filter((t) => t.category === cat).length;
    return { name: cat, value: count };
  });

  // Tasks by Status
  const statusData = [
    { name: 'To Do', value: tasks.filter((t) => t.status === 'todo').length },
    { name: 'In Progress', value: tasks.filter((t) => t.status === 'in-progress').length },
    { name: 'Completed', value: completedTasks },
  ];

  // Completion Trend: Group tasks completed by date (last 7 days)
  const trendMap: { [key: string]: number } = {};
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    trendMap[dateStr] = 0;
  }

  tasks.forEach((t) => {
    if (t.status === 'completed' && t.updatedAt) {
      const dateStr = new Date(t.updatedAt).toISOString().split('T')[0];
      if (trendMap[dateStr] !== undefined) {
        trendMap[dateStr]++;
      }
    }
  });

  const completionTrend = Object.keys(trendMap).map((date) => ({
    date,
    completed: trendMap[date],
  }));

  return {
    totalTasks,
    completedTasks,
    activeUsers,
    avgCompletionRate,
    categoryData,
    statusData,
    completionTrend,
  };
};

export const getTasks = async (req: AuthRequest, res: Response) => {
  const { page, limit, category, priority, status, search, sortBy, order } = req.query;

  try {
    if (isMongoConnected) {
      // MongoDB Query building
      const filter: any = {};

      if (category) filter.category = category;
      if (priority) filter.priority = priority;
      if (status) filter.status = status;
      if (search) {
        filter.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { tags: { $in: [new RegExp(search as string, 'i')] } },
        ];
      }

      const sortField = (sortBy as string) || 'createdAt';
      const sortOrder = order === 'asc' ? 1 : -1;
      const sortObj: any = { [sortField]: sortOrder };

      const pageNum = Number(page) || 1;
      const limitNum = Number(limit) || 12;
      const skip = (pageNum - 1) * limitNum;

      const total = await Task.countDocuments(filter);
      const tasks = await Task.find(filter)
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum);

      return res.json({
        success: true,
        tasks,
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
      });
    } else {
      // Local JSON DB Query
      const queryParams = {
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        category: category as string,
        priority: priority as string,
        status: status as string,
        search: search as string,
        sortBy: sortBy as string,
        order: order as 'asc' | 'desc',
      };
      const result = jsonDb.queryTasks(queryParams);
      return res.json({
        success: true,
        ...result,
      });
    }
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getMyTasks = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Not authorized' });
  }

  const { status, search } = req.query;

  try {
    if (isMongoConnected) {
      const filter: any = { 'createdBy.userId': req.user.userId };
      if (status) filter.status = status;
      if (search) {
        filter.title = { $regex: search, $options: 'i' };
      }

      const tasks = await Task.find(filter).sort({ createdAt: -1 });
      return res.json({ success: true, tasks });
    } else {
      let tasks = jsonDb.getTasks().filter((t) => t.createdBy.userId === req.user?.userId);
      if (status) {
        tasks = tasks.filter((t) => t.status === status);
      }
      if (search) {
        const term = (search as string).toLowerCase();
        tasks = tasks.filter((t) => t.title.toLowerCase().includes(term));
      }
      return res.json({ success: true, tasks });
    }
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getTaskById = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    if (isMongoConnected) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'Invalid task ID format' });
      }
      const task = await Task.findById(id);
      if (!task) {
        return res.status(404).json({ success: false, message: 'Task not found' });
      }
      return res.json({ success: true, task });
    } else {
      const tasks = jsonDb.getTasks();
      const task = tasks.find((t) => t._id === id);
      if (!task) {
        return res.status(404).json({ success: false, message: 'Task not found' });
      }
      return res.json({ success: true, task });
    }
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createTask = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Not authorized' });
  }

  const { title, description, category, priority, status, dueDate, tags, attachments } = req.body;

  try {
    if (isMongoConnected) {
      const task = await Task.create({
        title,
        description,
        category,
        priority: priority || 'medium',
        status: status || 'todo',
        dueDate,
        tags: tags || [],
        attachments: attachments || [],
        createdBy: {
          userId: req.user.userId,
          name: req.user.name,
          email: req.user.email,
        },
      });

      return res.status(201).json({ success: true, task });
    } else {
      const taskId = 'task_' + Math.random().toString(36).substring(2, 11);
      const newTask = {
        _id: taskId,
        title,
        description,
        category,
        priority: priority || 'medium',
        status: status || 'todo',
        dueDate: new Date(dueDate),
        tags: tags || [],
        attachments: attachments || [],
        createdBy: {
          userId: req.user.userId,
          name: req.user.name,
          email: req.user.email,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const tasks = jsonDb.getTasks();
      tasks.push(newTask);
      jsonDb.saveTasks(tasks);

      return res.status(201).json({ success: true, task: newTask });
    }
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateTask = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Not authorized' });
  }

  const { id } = req.params;
  const { title, description, category, priority, status, dueDate, tags, attachments } = req.body;

  try {
    if (isMongoConnected) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'Invalid task ID format' });
      }

      const task = await Task.findById(id);
      if (!task) {
        return res.status(404).json({ success: false, message: 'Task not found' });
      }

      // Check ownership
      if (task.createdBy.userId.toString() !== req.user.userId) {
        return res.status(403).json({ success: false, message: 'Not authorized to update this task' });
      }

      const updatedTask = await Task.findByIdAndUpdate(
        id,
        {
          title: title !== undefined ? title : task.title,
          description: description !== undefined ? description : task.description,
          category: category !== undefined ? category : task.category,
          priority: priority !== undefined ? priority : task.priority,
          status: status !== undefined ? status : task.status,
          dueDate: dueDate !== undefined ? dueDate : task.dueDate,
          tags: tags !== undefined ? tags : task.tags,
          attachments: attachments !== undefined ? attachments : task.attachments,
        },
        { new: true }
      );

      return res.json({ success: true, task: updatedTask });
    } else {
      const tasks = jsonDb.getTasks();
      const taskIndex = tasks.findIndex((t) => t._id === id);

      if (taskIndex === -1) {
        return res.status(404).json({ success: false, message: 'Task not found' });
      }

      const task = tasks[taskIndex];

      // Check ownership
      if (task.createdBy.userId !== req.user.userId) {
        return res.status(403).json({ success: false, message: 'Not authorized to update this task' });
      }

      const updatedTask = {
        ...task,
        title: title !== undefined ? title : task.title,
        description: description !== undefined ? description : task.description,
        category: category !== undefined ? category : task.category,
        priority: priority !== undefined ? priority : task.priority,
        status: status !== undefined ? status : task.status,
        dueDate: dueDate !== undefined ? new Date(dueDate) : new Date(task.dueDate),
        tags: tags !== undefined ? tags : task.tags,
        attachments: attachments !== undefined ? attachments : task.attachments,
        updatedAt: new Date(),
      };

      tasks[taskIndex] = updatedTask;
      jsonDb.saveTasks(tasks);

      return res.json({ success: true, task: updatedTask });
    }
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteTask = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Not authorized' });
  }

  const { id } = req.params;

  try {
    if (isMongoConnected) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'Invalid task ID format' });
      }

      const task = await Task.findById(id);
      if (!task) {
        return res.status(404).json({ success: false, message: 'Task not found' });
      }

      // Check ownership
      if (task.createdBy.userId.toString() !== req.user.userId) {
        return res.status(403).json({ success: false, message: 'Not authorized to delete this task' });
      }

      await Task.findByIdAndDelete(id);
      return res.json({ success: true, message: 'Task deleted successfully' });
    } else {
      const tasks = jsonDb.getTasks();
      const taskIndex = tasks.findIndex((t) => t._id === id);

      if (taskIndex === -1) {
        return res.status(404).json({ success: false, message: 'Task not found' });
      }

      const task = tasks[taskIndex];

      // Check ownership
      if (task.createdBy.userId !== req.user.userId) {
        return res.status(403).json({ success: false, message: 'Not authorized to delete this task' });
      }

      tasks.splice(taskIndex, 1);
      jsonDb.saveTasks(tasks);

      return res.json({ success: true, message: 'Task deleted successfully' });
    }
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getTaskStats = async (req: Request, res: Response) => {
  try {
    let tasks: any[] = [];

    if (isMongoConnected) {
      tasks = await Task.find({});
    } else {
      tasks = jsonDb.getTasks();
    }

    // Include some demo tasks if empty, so that charts have data out of the box
    if (tasks.length === 0) {
      const demoTasks = getDemoTasks();
      if (!isMongoConnected) {
        jsonDb.saveTasks(demoTasks);
        tasks = demoTasks;
      }
    }

    const stats = await calculateStats(tasks);
    return res.json({ success: true, stats });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Private helper to populate demo tasks for visualization
function getDemoTasks(): ITask[] {
  const today = new Date();
  const demoUserId = 'demo_user_123';
  
  const makeDate = (daysOffset: number) => {
    const d = new Date();
    d.setDate(today.getDate() + daysOffset);
    return d;
  };

  const makePastDate = (daysOffset: number) => {
    const d = new Date();
    d.setDate(today.getDate() - daysOffset);
    return d;
  };

  return [
    {
      _id: 'task_demo1',
      title: 'Complete Project Architecture Design',
      description: 'Create the backend models, schemas, controller logic, and visual UI layouts for the Eventify task board.',
      category: 'Work' as TaskCategory,
      priority: 'high' as TaskPriority,
      status: 'completed' as TaskStatus,
      dueDate: makeDate(3),
      createdBy: { userId: demoUserId, name: 'Demo User', email: 'demo@example.com' },
      tags: ['architecture', 'design', 'backend'],
      attachments: ['https://example.com/spec.pdf'],
      createdAt: makePastDate(3),
      updatedAt: makePastDate(1),
    },
    {
      _id: 'task_demo2',
      title: 'Implement Authentication & Login UI',
      description: 'Build JWT authorization middlewares and centered validation card layouts for users and admins.',
      category: 'Work' as TaskCategory,
      priority: 'high' as TaskPriority,
      status: 'in-progress' as TaskStatus,
      dueDate: makeDate(1),
      createdBy: { userId: demoUserId, name: 'Demo User', email: 'demo@example.com' },
      tags: ['auth', 'security', 'frontend'],
      attachments: [],
      createdAt: makePastDate(2),
      updatedAt: makePastDate(0),
    },
    {
      _id: 'task_demo3',
      title: 'Weekly Groceries & Ingredients Shopping',
      description: 'Purchase fresh organic vegetables, dynamic layout props, milk, energy drinks, and styling cards.',
      category: 'Shopping' as TaskCategory,
      priority: 'low' as TaskPriority,
      status: 'todo' as TaskStatus,
      dueDate: makeDate(4),
      createdBy: { userId: demoUserId, name: 'Demo User', email: 'demo@example.com' },
      tags: ['weekly', 'personal'],
      attachments: [],
      createdAt: makePastDate(1),
      updatedAt: makePastDate(1),
    },
    {
      _id: 'task_demo4',
      title: 'Gym Cardio & Strength Workout',
      description: 'Morning gym session focusing on physical endurance, core strength, fitness stats, and hydration levels.',
      category: 'Health' as TaskCategory,
      priority: 'medium' as TaskPriority,
      status: 'completed' as TaskStatus,
      dueDate: makeDate(2),
      createdBy: { userId: demoUserId, name: 'Demo User', email: 'demo@example.com' },
      tags: ['fitness', 'morning'],
      attachments: [],
      createdAt: makePastDate(2),
      updatedAt: makePastDate(2),
    },
    {
      _id: 'task_demo5',
      title: 'Study TypeScript Decorators & Enums',
      description: 'Read the official TypeScript docs about metadata reflection API, type guards, and generic models.',
      category: 'Education' as TaskCategory,
      priority: 'medium' as TaskPriority,
      status: 'todo' as TaskStatus,
      dueDate: makeDate(5),
      createdBy: { userId: 'admin_123', name: 'Demo Admin', email: 'admin@example.com' },
      tags: ['learning', 'typescript'],
      attachments: [],
      createdAt: makePastDate(1),
      updatedAt: makePastDate(1),
    },
    {
      _id: 'task_demo6',
      title: 'Review Monthly Budget & Subscriptions',
      description: 'Audit cloud service bills, server setups, software licenses, domain renewals, and other expenses.',
      category: 'Finance' as TaskCategory,
      priority: 'high' as TaskPriority,
      status: 'completed' as TaskStatus,
      dueDate: makeDate(6),
      createdBy: { userId: demoUserId, name: 'Demo User', email: 'demo@example.com' },
      tags: ['finance', 'audit'],
      attachments: [],
      createdAt: makePastDate(4),
      updatedAt: makePastDate(3),
    },
  ];
}
