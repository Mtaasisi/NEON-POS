/**
 * Cart Routes
 * Cart operations API
 */

import express from 'express';
import { z } from 'zod';
import { sql } from '../db/connection.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ApiError } from '../middleware/errorHandler.js';

const router = express.Router();

// Validation schemas
const addToCartSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  variantId: z.string().uuid('Invalid variant ID').optional(),
  quantity: z.number().int().positive('Quantity must be positive').default(1),
});

// POST /api/cart/add - Add item to cart
router.post('/add', authenticateToken, validate(addToCartSchema), async (req: AuthRequest, res, next) => {
  try {
    const { productId, variantId, quantity } = req.body;

    // Get product details
    const products = await sql`
      SELECT id, name, unit_price, selling_price, stock_quantity, is_active
      FROM lats_products
      WHERE id = ${productId}
      LIMIT 1
    `;

    if (products.length === 0) {
      throw new ApiError(404, 'Product not found');
    }

    const product = products[0];

    if (!product.is_active) {
      throw new ApiError(400, 'Product is not active');
    }

    // Get variant if specified
    let variant = null;
    if (variantId) {
      const variants = await sql`
        SELECT id, name, unit_price, selling_price, quantity, is_active, is_parent, variant_type, parent_variant_id
        FROM lats_product_variants
        WHERE id = ${variantId} AND product_id = ${productId}
        LIMIT 1
      `;

      if (variants.length === 0) {
        throw new ApiError(404, 'Variant not found');
      }

      variant = variants[0];

      if (!variant.is_active) {
        throw new ApiError(400, 'Variant is not active');
      }

      // Check variant stock
      // For parent variants, we should calculate stock from children
      let availableStock = variant.quantity;
      if (variant.is_parent || variant.variant_type === 'parent') {
        const childStockResult = await sql`
          SELECT COALESCE(SUM(quantity), 0) as total_stock
          FROM lats_product_variants
          WHERE parent_variant_id = ${variantId} AND is_active = true
        `;
        availableStock = childStockResult[0]?.total_stock || 0;
      }
      
      if (availableStock < quantity) {
        throw new ApiError(400, `Insufficient stock. Only ${availableStock} available`);
      }
    } else {
      // Check product stock
      if (product.stock_quantity < quantity) {
        throw new ApiError(400, `Insufficient stock. Only ${product.stock_quantity} available`);
      }
    }

    // Calculate price
    const price = variant 
      ? (variant.selling_price || variant.unit_price)
      : (product.selling_price || product.unit_price);

    if (!price || parseFloat(price as string) <= 0) {
      throw new ApiError(400, 'Product has no valid price');
    }

    // Return cart item data
    res.json({
      success: true,
      data: {
        productId: product.id,
        variantId: variant?.id,
        name: product.name,
        variantName: variant?.name,
        price: parseFloat(price as string),
        quantity,
        totalPrice: parseFloat(price as string) * quantity,
        stockAvailable: variant ? variant.quantity : product.stock_quantity,
      },
      message: 'Product added to cart',
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/cart/validate - Validate cart before checkout
router.post('/validate', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      throw new ApiError(400, 'Cart is empty');
    }

    const validationResults = [];
    let totalAmount = 0;

    for (const item of items) {
      const { productId, variantId, quantity } = item;

      // Validate product exists and has stock
      if (variantId) {
        const variants = await sql`
          SELECT quantity, selling_price, is_active, is_parent, variant_type
          FROM lats_product_variants
          WHERE id = ${variantId}
          LIMIT 1
        `;

        if (variants.length === 0 || !variants[0].is_active) {
          validationResults.push({
            productId,
            variantId,
            valid: false,
            error: 'Variant not available',
          });
          continue;
        }

        // Check stock - for parent variants, calculate from children
        let availableStock = variants[0].quantity;
        if (variants[0].is_parent || variants[0].variant_type === 'parent') {
          const childStockResult = await sql`
            SELECT COALESCE(SUM(quantity), 0) as total_stock
            FROM lats_product_variants
            WHERE parent_variant_id = ${variantId} AND is_active = true
          `;
          availableStock = childStockResult[0]?.total_stock || 0;
        }

        if (availableStock < quantity) {
          validationResults.push({
            productId,
            variantId,
            valid: false,
            error: `Insufficient stock. Only ${availableStock} available`,
          });
          continue;
        }

        totalAmount += parseFloat(variants[0].selling_price) * quantity;
        validationResults.push({ productId, variantId, valid: true });
      } else {
        // Validate product
        const products = await sql`
          SELECT stock_quantity, selling_price, is_active
          FROM lats_products
          WHERE id = ${productId}
          LIMIT 1
        `;

        if (products.length === 0 || !products[0].is_active) {
          validationResults.push({
            productId,
            valid: false,
            error: 'Product not available',
          });
          continue;
        }

        if (products[0].stock_quantity < quantity) {
          validationResults.push({
            productId,
            valid: false,
            error: `Insufficient stock. Only ${products[0].stock_quantity} available`,
          });
          continue;
        }

        totalAmount += parseFloat(products[0].selling_price) * quantity;
        validationResults.push({ productId, valid: true });
      }
    }

    const allValid = validationResults.every(r => r.valid);

    res.json({
      success: true,
      valid: allValid,
      results: validationResults,
      totalAmount,
    });
  } catch (error) {
    next(error);
  }
});

export default router;

