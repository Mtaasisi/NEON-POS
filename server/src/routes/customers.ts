/**
 * Customers Routes
 * Customer management API
 */

import express from 'express';
import { sql } from '../db/connection.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// GET /api/customers - List all customers
router.get('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { search, limit = 50, offset = 0 } = req.query;

    let query;
    if (search && typeof search === 'string') {
      const searchPattern = `%${search.toLowerCase()}%`;
      query = sql`
        SELECT *
        FROM lats_customers
        WHERE LOWER(name) LIKE ${searchPattern}
           OR LOWER(phone) LIKE ${searchPattern}
           OR LOWER(email) LIKE ${searchPattern}
        ORDER BY name
        LIMIT ${Number(limit)}
        OFFSET ${Number(offset)}
      `;
    } else {
      query = sql`
        SELECT *
        FROM lats_customers
        ORDER BY name
        LIMIT ${Number(limit)}
        OFFSET ${Number(offset)}
      `;
    }

    const customers = await query;

    res.json({
      success: true,
      data: customers,
      count: customers.length,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/customers/:id - Get single customer
router.get('/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    const customers = await sql`
      SELECT *
      FROM lats_customers
      WHERE id = ${id}
      LIMIT 1
    `;

    if (customers.length === 0) {
      return res.status(404).json({
        error: 'Customer not found',
      });
    }

    res.json({
      success: true,
      data: customers[0],
    });
  } catch (error) {
    next(error);
  }
});

export default router;

