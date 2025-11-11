/**
 * Sales Routes
 * Create and manage sales
 */

import express from 'express';
import { z } from 'zod';
import { sql } from '../db/connection.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ApiError } from '../middleware/errorHandler.js';

const router = express.Router();

// Validation schema
const createSaleSchema = z.object({
  customerId: z.string().uuid().optional(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    variantId: z.string().uuid().optional(),
    quantity: z.number().positive(),
    unitPrice: z.number().positive(),
  })),
  paymentMethod: z.string(),
  totalAmount: z.number().positive(),
  discountAmount: z.number().min(0).default(0),
  taxAmount: z.number().min(0).default(0),
});

// POST /api/sales - Create new sale
router.post('/', authenticateToken, validate(createSaleSchema), async (req: AuthRequest, res, next) => {
  try {
    const { customerId, items, paymentMethod, totalAmount, discountAmount, taxAmount } = req.body;
    const userId = req.user!.id;

    // Validate total amount matches items
    const calculatedTotal = items.reduce((sum: number, item: any) => 
      sum + (item.unitPrice * item.quantity), 0
    );

    if (Math.abs(calculatedTotal - (totalAmount + discountAmount - taxAmount)) > 0.01) {
      throw new ApiError(400, 'Total amount mismatch');
    }

    // Start transaction
    const sale = await sql.begin(async (sql) => {
      // Create sale record
      const sales = await sql`
        INSERT INTO lats_sales (
          user_id,
          customer_id,
          total_amount,
          discount_amount,
          tax_amount,
          payment_method,
          status
        ) VALUES (
          ${userId},
          ${customerId || null},
          ${totalAmount},
          ${discountAmount},
          ${taxAmount},
          ${paymentMethod},
          'completed'
        )
        RETURNING *
      `;

      const saleId = sales[0].id;

      // Create sale items
      for (const item of items) {
        await sql`
          INSERT INTO lats_sale_items (
            sale_id,
            product_id,
            variant_id,
            quantity,
            unit_price,
            total_price
          ) VALUES (
            ${saleId},
            ${item.productId},
            ${item.variantId || null},
            ${item.quantity},
            ${item.unitPrice},
            ${item.unitPrice * item.quantity}
          )
        `;

        // Update stock
        if (item.variantId) {
          // Check if this is a parent variant (shouldn't happen, but handle it)
          const variantCheck = await sql`
            SELECT is_parent, variant_type FROM lats_product_variants WHERE id = ${item.variantId} LIMIT 1
          `;
          
          const isParentVariant = variantCheck[0]?.is_parent || variantCheck[0]?.variant_type === 'parent';
          
          if (isParentVariant) {
            // For parent variants, we should update children (FIFO or specific selection)
            // For now, just log a warning - this should be handled at POS level
            console.warn(`Warning: Attempting to sell parent variant ${item.variantId}. Children should be selected instead.`);
          }
          
          // Update variant stock (works for both parent and child)
          // Database triggers will auto-update parent stock when children change
          await sql`
            UPDATE lats_product_variants
            SET quantity = quantity - ${item.quantity}
            WHERE id = ${item.variantId}
          `;
        } else {
          await sql`
            UPDATE lats_products
            SET stock_quantity = stock_quantity - ${item.quantity}
            WHERE id = ${item.productId}
          `;
        }
      }

      return sales[0];
    });

    res.status(201).json({
      success: true,
      data: sale,
      message: 'Sale created successfully',
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/sales - List sales
router.get('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const sales = await sql`
      SELECT 
        s.*,
        c.name as customer_name,
        u.full_name as user_name,
        (
          SELECT json_agg(json_build_object(
            'product_id', si.product_id,
            'variant_id', si.variant_id,
            'quantity', si.quantity,
            'unit_price', si.unit_price,
            'total_price', si.total_price
          ))
          FROM lats_sale_items si
          WHERE si.sale_id = s.id
        ) as items
      FROM lats_sales s
      LEFT JOIN lats_customers c ON s.customer_id = c.id
      LEFT JOIN auth_users u ON s.user_id = u.id
      ORDER BY s.created_at DESC
      LIMIT ${Number(limit)}
      OFFSET ${Number(offset)}
    `;

    res.json({
      success: true,
      data: sales,
      count: sales.length,
    });
  } catch (error) {
    next(error);
  }
});

export default router;

