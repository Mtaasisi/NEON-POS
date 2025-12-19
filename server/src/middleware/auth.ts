/**
 * Authentication Middleware
 * JWT token verification
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { sql } from '../db/connection.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    branchId: string;
  };
}

export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'No token provided',
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    // Fetch user data including branch_id
    const users = await sql`
      SELECT id, email, role, branch_id
      FROM auth_users
      WHERE id = ${decoded.id}
      LIMIT 1
    `;

    if (users.length === 0) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'User not found',
      });
    }

    const user = users[0];
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      branchId: user.branch_id,
    };
    next();
  } catch (error) {
    return res.status(403).json({
      error: 'Invalid token',
      message: 'Token verification failed',
    });
  }
};

export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    // Fetch user data including branch_id
    const users = await sql`
      SELECT id, email, role, branch_id
      FROM auth_users
      WHERE id = ${decoded.id}
      LIMIT 1
    `;

    if (users.length > 0) {
      const user = users[0];
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        branchId: user.branch_id,
      };
    }
  } catch (error) {
    // Invalid token, but continue anyway
  }

  next();
};

export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: `Requires one of: ${roles.join(', ')}`,
      });
    }

    next();
  };
};

