/**
 * Products Routes
 * CRUD operations for products
 */

import express from 'express';
import { z } from 'zod';
import { sql } from '../db/connection.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { validate, validateQuery } from '../middleware/validate.js';
import { ApiError } from '../middleware/errorHandler.js';

const router = express.Router();

// Validation schemas
const searchSchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  limit: z.string().optional().transform(Number),
  offset: z.string().optional().transform(Number),
});

// GET /api/products - List all products
router.get('/', authenticateToken, validateQuery(searchSchema), async (req: AuthRequest, res, next) => {
  try {
    const { q, category, limit = 50, offset = 0 } = req.query as any;
    const currentBranchId = req.user?.branchId;

    // 🔒 BRANCH ISOLATION SAFEGUARD: Ensure user has a branch assigned
    if (!currentBranchId) {
      console.warn('⚠️ [ProductsAPI] User has no branch assigned - this may cause data leakage');
      return res.status(400).json({
        success: false,
        error: 'Branch not assigned',
        message: 'You must be assigned to a branch to view products'
      });
    }

    // Get branch isolation settings
    let branchSettings = null;
    if (currentBranchId) {
      const settingsResult = await sql`
        SELECT data_isolation_mode, share_inventory
        FROM store_locations
        WHERE id = ${currentBranchId}
        LIMIT 1
      `;
      branchSettings = settingsResult[0];
    }

    // Build variant filter clause based on branch isolation settings
    let variantFilter = '';
    if (branchSettings) {
      if (branchSettings.data_isolation_mode === 'isolated') {
        // Isolated mode: Only show variants from this branch
        variantFilter = sql`AND v.branch_id = ${currentBranchId}`;
      } else if (branchSettings.data_isolation_mode === 'hybrid') {
        if (!branchSettings.share_inventory) {
          // Hybrid mode with isolated inventory: Only show variants from this branch
          variantFilter = sql`AND v.branch_id = ${currentBranchId}`;
        }
        // Hybrid mode with shared inventory: No additional filter needed
      }
      // Shared mode: No additional filter needed
    } else if (currentBranchId) {
      // Default fallback: filter by current branch
      variantFilter = sql`AND v.branch_id = ${currentBranchId}`;
    }

    let query;

    if (q || category) {
      // Search with filters
      query = sql`
        SELECT
          p.*,
          c.name as category_name,
          (
            SELECT json_agg(json_build_object(
              'id', v.id,
              'name', v.name,
              'sku', v.sku,
              'barcode', v.barcode,
              'unit_price', v.unit_price,
              'selling_price', v.selling_price,
              'cost_price', v.cost_price,
              'quantity', v.quantity,
              'is_active', v.is_active,
              'is_parent', v.is_parent,
              'variant_type', v.variant_type,
              'parent_variant_id', v.parent_variant_id
            ))
            FROM lats_product_variants v
            WHERE v.product_id = p.id
              AND v.is_active = true
              AND v.parent_variant_id IS NULL
              ${variantFilter}
          ) as variants
        FROM lats_products p
        LEFT JOIN lats_categories c ON p.category_id = c.id
        WHERE p.is_active = true
          AND (${q ? sql`LOWER(p.name) LIKE ${`%${q.toLowerCase()}%`}` : sql`true`})
          AND (${category ? sql`p.category_id = ${category}` : sql`true`})
        ORDER BY p.name
        LIMIT ${limit}
        OFFSET ${offset}
      `;
    } else {
      // Get all active products
      query = sql`
        SELECT
          p.*,
          c.name as category_name,
          (
            SELECT json_agg(json_build_object(
              'id', v.id,
              'name', v.name,
              'sku', v.sku,
              'barcode', v.barcode,
              'unit_price', v.unit_price,
              'selling_price', v.selling_price,
              'cost_price', v.cost_price,
              'quantity', v.quantity,
              'is_active', v.is_active,
              'is_parent', v.is_parent,
              'variant_type', v.variant_type,
              'parent_variant_id', v.parent_variant_id
            ))
            FROM lats_product_variants v
            WHERE v.product_id = p.id
              AND v.is_active = true
              AND v.parent_variant_id IS NULL
              ${variantFilter}
          ) as variants
        FROM lats_products p
        LEFT JOIN lats_categories c ON p.category_id = c.id
        WHERE p.is_active = true
        ORDER BY p.name
        LIMIT ${limit}
        OFFSET ${offset}
      `;
    }

    const products = await query;

    res.json({
      success: true,
      data: products,
      count: products.length,
      limit,
      offset,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/products/:id - Get single product
router.get('/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const currentBranchId = req.user?.branchId;

    // Get branch isolation settings
    let branchSettings = null;
    if (currentBranchId) {
      const settingsResult = await sql`
        SELECT data_isolation_mode, share_inventory
        FROM store_locations
        WHERE id = ${currentBranchId}
        LIMIT 1
      `;
      branchSettings = settingsResult[0];
    }

    // Build variant filter clause based on branch isolation settings
    let variantFilter = '';
    if (branchSettings) {
      if (branchSettings.data_isolation_mode === 'isolated') {
        // Isolated mode: Only show variants from this branch
        variantFilter = sql`AND v.branch_id = ${currentBranchId}`;
      } else if (branchSettings.data_isolation_mode === 'hybrid') {
        if (!branchSettings.share_inventory) {
          // Hybrid mode with isolated inventory: Only show variants from this branch
          variantFilter = sql`AND v.branch_id = ${currentBranchId}`;
        }
        // Hybrid mode with shared inventory: No additional filter needed
      }
      // Shared mode: No additional filter needed
    } else if (currentBranchId) {
      // Default fallback: filter by current branch
      variantFilter = sql`AND v.branch_id = ${currentBranchId}`;
    }

    const products = await sql`
      SELECT
        p.*,
        c.name as category_name,
        (
          SELECT json_agg(json_build_object(
            'id', v.id,
            'name', v.name,
            'sku', v.sku,
            'barcode', v.barcode,
            'unit_price', v.unit_price,
            'selling_price', v.selling_price,
            'cost_price', v.cost_price,
            'quantity', v.quantity,
            'is_active', v.is_active,
            'is_parent', v.is_parent,
            'variant_type', v.variant_type,
            'parent_variant_id', v.parent_variant_id
          ))
          FROM lats_product_variants v
          WHERE v.product_id = p.id
            AND v.parent_variant_id IS NULL
            ${variantFilter}
        ) as variants
      FROM lats_products p
      LEFT JOIN lats_categories c ON p.category_id = c.id
      WHERE p.id = ${id}
      LIMIT 1
    `;

    if (products.length === 0) {
      throw new ApiError(404, 'Product not found');
    }

    res.json({
      success: true,
      data: products[0],
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/products/search - Search products
router.get('/search', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string') {
      throw new ApiError(400, 'Search query is required');
    }

    const searchQuery = `%${q.toLowerCase()}%`;

    const products = await sql`
      SELECT 
        p.*,
        c.name as category_name,
          (
          SELECT json_agg(json_build_object(
            'id', v.id,
            'name', v.name,
            'unit_price', v.unit_price,
            'selling_price', v.selling_price,
            'quantity', v.quantity,
            'is_parent', v.is_parent,
            'variant_type', v.variant_type
          ))
          FROM lats_product_variants v
          WHERE v.product_id = p.id 
            AND v.is_active = true
            AND v.parent_variant_id IS NULL
        ) as variants
      FROM lats_products p
      LEFT JOIN lats_categories c ON p.category_id = c.id
      WHERE p.is_active = true
        AND (
          LOWER(p.name) LIKE ${searchQuery}
          OR LOWER(p.description) LIKE ${searchQuery}
          OR LOWER(p.sku) LIKE ${searchQuery}
          OR LOWER(c.name) LIKE ${searchQuery}
        )
      ORDER BY p.name
      LIMIT 20
    `;

    res.json({
      success: true,
      data: products,
      query: q,
    });
  } catch (error) {
    next(error);
  }
});

export default router;

