/**
 * 404 Not Found Handler
 */

import { Request, Response } from 'express';

export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`,
    availableRoutes: [
      'GET  /health',
      'POST /api/auth/login',
      'GET  /api/products',
      'POST /api/cart/add',
      'POST /api/sales',
    ],
  });
};

