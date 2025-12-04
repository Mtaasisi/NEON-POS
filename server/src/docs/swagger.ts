/**
 * Swagger/OpenAPI Documentation Configuration
 * 
 * Provides interactive API documentation for all endpoints
 */

import swaggerJsdoc from 'swagger-jsdoc';
import { Express } from 'express';
import swaggerUi from 'swagger-ui-express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'NEON POS API',
      version: '1.0.0',
      description: `
        Point of Sale System API Documentation
        
        ## Authentication
        Most endpoints require authentication via Bearer token.
        Include the token in the Authorization header:
        \`Authorization: Bearer YOUR_TOKEN\`
        
        ## Rate Limiting
        API is rate limited to 1000 requests per minute per IP address.
        
        ## Error Responses
        All errors follow this format:
        \`\`\`json
        {
          "error": "Error type",
          "message": "Detailed error message"
        }
        \`\`\`
      `,
      contact: {
        name: 'API Support',
        email: 'support@dukani.site'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:8000',
        description: 'Development server'
      },
      {
        url: 'https://api.dukani.site',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token obtained from /api/auth/login'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error type'
            },
            message: {
              type: 'string',
              description: 'Detailed error message'
            }
          },
          required: ['error', 'message']
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid'
            },
            email: {
              type: 'string',
              format: 'email'
            },
            role: {
              type: 'string',
              enum: ['admin', 'manager', 'customer-care', 'technician', 'store-keeper']
            },
            fullName: {
              type: 'string'
            },
            phone: {
              type: 'string'
            }
          }
        },
        Product: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid'
            },
            name: {
              type: 'string'
            },
            sku: {
              type: 'string'
            },
            category_id: {
              type: 'string',
              format: 'uuid'
            },
            price: {
              type: 'number',
              format: 'decimal'
            },
            cost_price: {
              type: 'number',
              format: 'decimal'
            },
            stock_quantity: {
              type: 'integer'
            },
            description: {
              type: 'string'
            },
            barcode: {
              type: 'string'
            },
            images: {
              type: 'array',
              items: {
                type: 'string'
              }
            }
          }
        },
        Sale: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid'
            },
            customer_id: {
              type: 'string',
              format: 'uuid'
            },
            total_amount: {
              type: 'number',
              format: 'decimal'
            },
            payment_method: {
              type: 'string',
              enum: ['cash', 'card', 'mobile_money', 'bank_transfer']
            },
            status: {
              type: 'string',
              enum: ['completed', 'pending', 'cancelled', 'refunded']
            },
            created_at: {
              type: 'string',
              format: 'date-time'
            }
          }
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Authentication required',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: 'Authentication required',
                message: 'No token provided'
              }
            }
          }
        },
        ForbiddenError: {
          description: 'Insufficient permissions',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: 'Forbidden',
                message: 'You do not have permission to access this resource'
              }
            }
          }
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: 'Not Found',
                message: 'The requested resource was not found'
              }
            }
          }
        },
        ValidationError: {
          description: 'Validation failed',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: 'Validation Error',
                message: 'Invalid input data'
              }
            }
          }
        },
        RateLimitError: {
          description: 'Rate limit exceeded',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: 'Too many requests',
                message: 'Rate limit exceeded. Please try again later.',
                retryAfter: 60
              }
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and session management'
      },
      {
        name: 'Products',
        description: 'Product inventory management'
      },
      {
        name: 'Sales',
        description: 'Sales transactions and orders'
      },
      {
        name: 'Customers',
        description: 'Customer management'
      },
      {
        name: 'Reports',
        description: 'Business analytics and reports'
      },
      {
        name: 'WhatsApp',
        description: 'WhatsApp integration and messaging'
      },
      {
        name: 'SMS',
        description: 'SMS messaging'
      }
    ]
  },
  apis: [
    './src/routes/*.ts',
    './src/routes/**/*.ts'
  ]
};

export const specs = swaggerJsdoc(options);

/**
 * Setup Swagger UI
 */
export const setupSwagger = (app: Express): void => {
  // Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'NEON POS API Documentation',
    customfavIcon: '/favicon.ico'
  }));

  // JSON endpoint
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });

  console.log('📚 API Documentation available at /api-docs');
};

export default { specs, setupSwagger };

