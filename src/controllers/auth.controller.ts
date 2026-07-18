import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { AuthRequest } from '../types';
import { isMongoConnected } from '../config/db';
import { jsonDb } from '../config/jsonDb';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-eventify-tasks-2026';

const generateToken = (payload: object): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
};

export const registerUser = async (req: Request, res: Response) => {
  const { name, email, password, role, avatar } = req.body;

  try {
    const normalizedEmail = email.toLowerCase().trim();

    if (isMongoConnected) {
      // MongoDB Flow
      const userExists = await User.findOne({ email: normalizedEmail });
      if (userExists) {
        return res.status(400).json({ success: false, message: 'User already exists' });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const user = await User.create({
        name,
        email: normalizedEmail,
        password: hashedPassword,
        role: role || 'user',
        avatar: avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${name}`,
      });

      const token = generateToken({
        userId: user._id,
        email: user.email,
        role: user.role,
        name: user.name,
      });

      return res.status(201).json({
        success: true,
        token,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
        },
      });
    } else {
      // JSON Db Fallback Flow
      const users = jsonDb.getUsers();
      const userExists = users.some((u) => u.email === normalizedEmail);
      if (userExists) {
        return res.status(400).json({ success: false, message: 'User already exists' });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      const userId = 'user_' + Math.random().toString(36).substring(2, 11);

      const newUser = {
        _id: userId,
        name,
        email: normalizedEmail,
        password: hashedPassword,
        role: role || 'user',
        avatar: avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${name}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      users.push(newUser);
      jsonDb.saveUsers(users);

      const token = generateToken({
        userId: newUser._id,
        email: newUser.email,
        role: newUser.role,
        name: newUser.name,
      });

      return res.status(201).json({
        success: true,
        token,
        user: {
          _id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          avatar: newUser.avatar,
        },
      });
    }
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const normalizedEmail = email.toLowerCase().trim();

    if (isMongoConnected) {
      // MongoDB Flow
      const user = await User.findOne({ email: normalizedEmail });
      if (!user) {
        return res.status(400).json({ success: false, message: 'Invalid credentials' });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(400).json({ success: false, message: 'Invalid credentials' });
      }

      const token = generateToken({
        userId: user._id,
        email: user.email,
        role: user.role,
        name: user.name,
      });

      return res.json({
        success: true,
        token,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
        },
      });
    } else {
      // JSON Db Fallback Flow
      const users = jsonDb.getUsers();
      const user = users.find((u) => u.email === normalizedEmail);
      if (!user) {
        return res.status(400).json({ success: false, message: 'Invalid credentials' });
      }

      const isMatch = await bcrypt.compare(password, user.password || '');
      if (!isMatch) {
        return res.status(400).json({ success: false, message: 'Invalid credentials' });
      }

      const token = generateToken({
        userId: user._id,
        email: user.email,
        role: user.role,
        name: user.name,
      });

      return res.json({
        success: true,
        token,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
        },
      });
    }
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getUserProfile = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    if (isMongoConnected) {
      const user = await User.findById(req.user.userId).select('-password');
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      return res.json({ success: true, user });
    } else {
      const users = jsonDb.getUsers();
      const user = users.find((u) => u._id === req?.user?.userId);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      const { password, ...userWithoutPassword } = user;
      return res.json({ success: true, user: userWithoutPassword });
    }
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
