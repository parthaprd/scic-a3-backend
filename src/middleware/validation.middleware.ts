import { Request, Response, NextFunction } from 'express';

export const validateRegister = (req: Request, res: Response, next: NextFunction) => {
  const { name, email, password, role } = req.body;
  const errors: string[] = [];

  if (!name || name.trim().length < 2) {
    errors.push('Name is required and must be at least 2 characters.');
  }

  if (!email || !/\S+@\S+\.\S+/.test(email)) {
    errors.push('A valid email address is required.');
  }

  if (!password || password.length < 6) {
    errors.push('Password must be at least 6 characters long.');
  }

  if (role && role !== 'user' && role !== 'admin') {
    errors.push('Role must be either user or admin.');
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  next();
};

export const validateLogin = (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body;
  const errors: string[] = [];

  if (!email || !/\S+@\S+\.\S+/.test(email)) {
    errors.push('A valid email address is required.');
  }

  if (!password || password.length < 6) {
    errors.push('Password is required and must be at least 6 characters.');
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  next();
};

export const validateTask = (req: Request, res: Response, next: NextFunction) => {
  const { title, description, category, priority, status, dueDate } = req.body;
  const errors: string[] = [];

  if (!title || title.trim().length < 3) {
    errors.push('Title is required and must be at least 3 characters.');
  }

  if (!description || description.trim().length < 10) {
    errors.push('Description is required and must be at least 10 characters.');
  }

  const validCategories = ['Work', 'Personal', 'Shopping', 'Health', 'Finance', 'Education', 'Other'];
  if (!category || !validCategories.includes(category)) {
    errors.push(`Category is required and must be one of: ${validCategories.join(', ')}.`);
  }

  if (priority && !['low', 'medium', 'high'].includes(priority)) {
    errors.push('Priority must be low, medium, or high.');
  }

  if (status && !['todo', 'in-progress', 'completed'].includes(status)) {
    errors.push('Status must be todo, in-progress, or completed.');
  }

  if (!dueDate) {
    errors.push('Due date is required.');
  } else {
    const dDate = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (isNaN(dDate.getTime()) || dDate < today) {
      errors.push('Due date must be a valid future date.');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  next();
};
