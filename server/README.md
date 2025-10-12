# 🚀 POS Backend API Server

Secure backend API server for the POS system.

---

## 🎯 Purpose

**Why We Need This**:
- ✅ **Security**: Database credentials stay on server (not in browser)
- ✅ **Performance**: Caching, rate limiting, optimization
- ✅ **Clean Console**: No more database connection errors
- ✅ **Scalability**: Ready for growth

**Before**: Frontend → Neon Database (Insecure ❌)  
**After**: Frontend → API Server → Database (Secure ✅)

---

## 📁 Structure

```
server/
├── package.json
├── tsconfig.json
├── .env.example
├── src/
│   ├── index.ts              # Main server file
│   ├── db/
│   │   └── connection.ts     # Database connection
│   ├── middleware/
│   │   ├── auth.ts           # JWT authentication
│   │   ├── errorHandler.ts  # Error handling
│   │   ├── notFoundHandler.ts # 404 handler
│   │   └── validate.ts       # Request validation
│   └── routes/
│       ├── auth.ts           # Auth endpoints
│       ├── products.ts       # Product endpoints
│       ├── customers.ts      # Customer endpoints
│       ├── sales.ts          # Sales endpoints
│       └── cart.ts           # Cart endpoints
```

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. Setup Environment

```bash
cp .env.example .env
# Edit .env and add your DATABASE_URL and JWT_SECRET
```

### 3. Start Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm run build
npm start
```

---

## 📡 API Endpoints

### Authentication
```
POST   /api/auth/login       # Login with email/password
GET    /api/auth/me          # Get current user
POST   /api/auth/logout      # Logout
```

### Products
```
GET    /api/products         # List all products
GET    /api/products/:id     # Get single product
GET    /api/products/search  # Search products
```

### Cart
```
POST   /api/cart/add         # Add item to cart
POST   /api/cart/validate    # Validate cart before checkout
```

### Sales
```
POST   /api/sales            # Create new sale
GET    /api/sales            # List sales
```

### Customers
```
GET    /api/customers        # List customers
GET    /api/customers/:id    # Get single customer
```

### Health Check
```
GET    /health               # Server health status
```

---

## 🔐 Authentication

All endpoints except `/health` and `/api/auth/login` require authentication.

**How to authenticate**:

1. Login to get token:
```javascript
POST /api/auth/login
{
  "email": "care@care.com",
  "password": "123456"
}

Response:
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { ... }
}
```

2. Include token in subsequent requests:
```javascript
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 💻 Frontend Integration

### Using the API Client

```javascript
import { apiClient } from '../lib/apiClient';

// Login
const { user, token } = await apiClient.login('care@care.com', '123456');

// Get products
const { data: products } = await apiClient.getProducts();

// Search products
const { data: results } = await apiClient.searchProducts('laptop');

// Add to cart
const { data: cartItem } = await apiClient.addToCart({
  productId: 'uuid-here',
  variantId: 'uuid-here',
  quantity: 1
});

// Create sale
const { data: sale } = await apiClient.createSale({
  customerId: 'uuid-here',
  items: [...],
  paymentMethod: 'cash',
  totalAmount: 10000
});
```

---

## 🛡️ Security Features

✅ **Helmet**: Security headers  
✅ **CORS**: Controlled access  
✅ **JWT**: Token-based auth  
✅ **Rate Limiting**: Prevent abuse  
✅ **Input Validation**: Zod schemas  
✅ **Error Handling**: Safe error messages  

---

## 🚦 Error Handling

All errors return consistent format:

```json
{
  "error": "Error title",
  "message": "Detailed message",
  "status": 400
}
```

Common status codes:
- `200` - Success
- `201` - Created
- `400` - Bad request (validation error)
- `401` - Unauthorized (not logged in)
- `403` - Forbidden (insufficient permissions)
- `404` - Not found
- `500` - Server error

---

## 📊 Response Format

All successful responses follow this format:

```json
{
  "success": true,
  "data": { ... },
  "message": "Optional message"
}
```

List responses include pagination:

```json
{
  "success": true,
  "data": [...],
  "count": 20,
  "limit": 50,
  "offset": 0
}
```

---

## 🧪 Testing

### Test with curl:

```bash
# Health check
curl http://localhost:8000/health

# Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"care@care.com","password":"123456"}'

# Get products (with token)
curl http://localhost:8000/api/products \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 8000 |
| `NODE_ENV` | Environment | development |
| `DATABASE_URL` | Neon database URL | Required |
| `JWT_SECRET` | JWT signing key | Required |
| `JWT_EXPIRES_IN` | Token expiry | 7d |
| `CORS_ORIGIN` | Allowed origin | http://localhost:3000 |

---

## 📈 Performance

- **Connection Pooling**: Max 10 concurrent connections
- **Compression**: Gzip compression enabled
- **Caching**: Can add Redis later
- **Rate Limiting**: 100 requests per 15 minutes

---

## 🐛 Troubleshooting

### Server won't start
- Check `.env` file exists and has `DATABASE_URL`
- Verify port 8000 is not in use: `lsof -i :8000`

### Database connection fails
- Verify `DATABASE_URL` is correct
- Check Neon database is accessible

### CORS errors
- Verify `CORS_ORIGIN` matches frontend URL
- Check browser is not blocking requests

---

## 🚀 Deployment

### Production Checklist

- [ ] Set strong `JWT_SECRET`
- [ ] Set `NODE_ENV=production`
- [ ] Use HTTPS
- [ ] Enable rate limiting
- [ ] Setup monitoring
- [ ] Configure logging
- [ ] Setup backups

### Deploy Options

**Option 1: Heroku**
```bash
heroku create your-app-name
git push heroku main
heroku config:set DATABASE_URL=your_url
```

**Option 2: Railway**
```bash
railway init
railway up
```

**Option 3: Render/Fly.io/DigitalOcean**
Follow their deployment guides

---

## 📞 Support

**Issue**: Token expired  
**Solution**: Login again to get new token

**Issue**: 401 Unauthorized  
**Solution**: Check token is included in Authorization header

**Issue**: 500 Server error  
**Solution**: Check server logs for details

---

*Backend API ready for production!* ✅

