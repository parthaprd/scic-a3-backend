import fs from 'fs';
import path from 'path';
import { ITask, IUser } from '../types';

const DATA_DIR = path.join(__dirname, '../../.data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const TASKS_FILE = path.join(DATA_DIR, 'tasks.json');

// Ensure data folder and files exist
const initJSONDb = () => {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2));
  }
  if (!fs.existsSync(TASKS_FILE)) {
    fs.writeFileSync(TASKS_FILE, JSON.stringify([], null, 2));
  }
};

export const jsonDb = {
  getUsers: (): IUser[] => {
    initJSONDb();
    try {
      const data = fs.readFileSync(USERS_FILE, 'utf-8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  },

  saveUsers: (users: IUser[]) => {
    initJSONDb();
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  },

  getTasks: (): ITask[] => {
    initJSONDb();
    try {
      const data = fs.readFileSync(TASKS_FILE, 'utf-8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  },

  saveTasks: (tasks: ITask[]) => {
    initJSONDb();
    fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2));
  },

  // Helper query methods for tasks
  queryTasks: (query: {
    page?: number;
    limit?: number;
    category?: string;
    priority?: string;
    status?: string;
    search?: string;
    sortBy?: string;
    order?: 'asc' | 'desc';
    userId?: string;
  }) => {
    let tasks = jsonDb.getTasks();

    // Filter by User ID if specified
    if (query.userId) {
      tasks = tasks.filter((t) => t.createdBy.userId === query.userId);
    }

    // Filter by Category
    if (query.category) {
      tasks = tasks.filter((t) => t.category.toLowerCase() === query.category?.toLowerCase());
    }

    // Filter by Priority
    if (query.priority) {
      tasks = tasks.filter((t) => t.priority.toLowerCase() === query.priority?.toLowerCase());
    }

    // Filter by Status
    if (query.status) {
      tasks = tasks.filter((t) => t.status.toLowerCase() === query.status?.toLowerCase());
    }

    // Filter by Search (title match)
    if (query.search) {
      const term = query.search.toLowerCase();
      tasks = tasks.filter(
        (t) =>
          t.title.toLowerCase().includes(term) ||
          t.description.toLowerCase().includes(term) ||
          t.tags.some((tag) => tag.toLowerCase().includes(term))
      );
    }

    // Sort tasks
    const sortBy = query.sortBy || 'createdAt';
    const order = query.order || 'desc';
    
    tasks.sort((a: any, b: any) => {
      let valA = a[sortBy];
      let valB = b[sortBy];

      // Handle dates
      if (sortBy === 'dueDate' || sortBy === 'createdAt' || sortBy === 'updatedAt') {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      }

      if (valA < valB) return order === 'asc' ? -1 : 1;
      if (valA > valB) return order === 'asc' ? 1 : -1;
      return 0;
    });

    // Pagination
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 12;
    const startIndex = (page - 1) * limit;
    const total = tasks.length;
    const paginatedTasks = tasks.slice(startIndex, startIndex + limit);

    return {
      tasks: paginatedTasks,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  },
};
