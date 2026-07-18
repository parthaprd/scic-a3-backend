import { Request } from 'express';

export type UserRole = 'user' | 'admin';

export interface IUser {
  _id?: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  avatar?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type TaskCategory = 'Work' | 'Personal' | 'Shopping' | 'Health' | 'Finance' | 'Education' | 'Other';
export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskStatus = 'todo' | 'in-progress' | 'completed';

export interface ITaskCreatedBy {
  userId: string;
  name: string;
  email: string;
}

export interface ITask {
  _id?: string;
  title: string;
  description: string;
  category: TaskCategory;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: Date;
  createdBy: ITaskCreatedBy;
  tags: string[];
  attachments?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: UserRole;
    name: string;
  };
}
