# 🚀 Production Deployment Guide - WhatsApp Webhooks

## ✅ Production Readiness Checklist

### Security ✓
- [x] Rate limiting (1000 req/min per IP)
- [x] Webhook signature verification (optional)
- [x] HTTPS enforcement
- [x] Input validation
- [x] SQL injection prevention (Supabase handles this)
- [x] Sensitive data masking in logs

### Reliability ✓
- [x] Async processing (non-blocking)
- [x] Error handling & retry logic
- [x] Duplicate message prevention
- [x] Failed webhook logging
- [x] Health check endpoint
- [x] Request monitoring

### Performance ✓
- [x] Fast response time (<200ms)
- [x] Database indexing
- [x] Connection pooling (Supabase)
- [x] Payload size limits
- [x] Memory management

---

## 📋 Environment Variables

### Required Variables

Create a `.env` file in your `server/` directory:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Alternative names (server will check both)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here

# Server Configuration
NODE_ENV=production
PORT=8000

# Optional: Webhook Security (recommended for production)
WHATSAPP_WEBHOOK_SECRET=your-secret-key-here

# Optional: CORS
CORS_ORIGIN=https://yourdomain.com

# Optional: Logging
LOG_LEVEL=info
```

### Generate Webhook Secret

```bash
# Generate a strong webhook secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 🌐 Deployment Options

### Option 1: Railway (Recommended)

**Why Railway?**
- ✅ Automatic HTTPS
- ✅ One-click deploy
- ✅ Auto-scaling
- ✅ Free tier available
- ✅ Built-in monitoring

**Steps:**

1. **Install Railway CLI:**
```bash
npm install -g @railway/cli
```

2. **Login:**
```bash
railway login
```

3. **Initialize project:**
```bash
cd server
railway init
```

4. **Add environment variables:**
```bash
railway variables set VITE_SUPABASE_URL=your-url
railway variables set VITE_SUPABASE_ANON_KEY=your-key
railway variables set NODE_ENV=production
railway variables set WHATSAPP_WEBHOOK_SECRET=your-secret
```

5. **Deploy:**
```bash
railway up
```

6. **Get your URL:**
```bash
railway domain
# Your webhook will be at: https://your-app.railway.app/api/whatsapp/webhook
```

---

### Option 2: Heroku

1. **Install Heroku CLI:**
```bash
brew install heroku/brew/heroku  # macOS
# or download from heroku.com
```

2. **Login & Create app:**
```bash
heroku login
cd server
heroku create your-app-name
```

3. **Set environment variables:**
```bash
heroku config:set VITE_SUPABASE_URL=your-url
heroku config:set VITE_SUPABASE_ANON_KEY=your-key
heroku config:set NODE_ENV=production
heroku config:set WHATSAPP_WEBHOOK_SECRET=your-secret
```

4. **Create Procfile:**
```bash
echo "web: npm start" > Procfile
```

5. **Deploy:**
```bash
git add .
git commit -m "Deploy to Heroku"
git push heroku main
```

6. **Your webhook URL:**
```
https://your-app-name.herokuapp.com/api/whatsapp/webhook
```

---

### Option 3: DigitalOcean App Platform

1. **Go to:** https://cloud.digitalocean.com/apps
2. **Click "Create App"**
3. **Connect GitHub repo** or upload code
4. **Select `server/` directory**
5. **Add environment variables** in dashboard
6. **Deploy**

**Your webhook URL:**
```
https://your-app-name.ondigitalocean.app/api/whatsapp/webhook
```

---

### Option 4: Vercel (Serverless)

1. **Install Vercel CLI:**
```bash
npm install -g vercel
```

2. **Create `vercel.json` in server directory:**
```json
{
  "version": 2,
  "builds": [
    {
      "src": "dist/index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "dist/index.js"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

3. **Deploy:**
```bash
cd server
npm run build
vercel --prod
```

4. **Set environment variables** in Vercel dashboard

---

### Option 5: VPS (Advanced)

**For Ubuntu/Debian VPS:**

1. **Install Node.js:**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

2. **Install PM2:**
```bash
sudo npm install -g pm2
```

3. **Upload your code:**
```bash
scp -r server/ user@your-server:/var/www/
```

4. **Install dependencies:**
```bash
cd /var/www/server
npm install
npm run build
```

5. **Create ecosystem.config.js:**
```javascript
module.exports = {
  apps: [{
    name: 'whatsapp-webhook',
    script: './dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 8000
    }
  }]
};
```

6. **Start with PM2:**
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

7. **Setup Nginx reverse proxy:**
```nginx
server {
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
}
```

8. **Get SSL certificate:**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## 🔧 Post-Deployment Setup

### 1. Run Database Migration

```bash
# Connect to your production database and run:
node setup-whatsapp-webhook.mjs
```

Or manually execute in Supabase SQL Editor:
```sql
-- Copy contents from migrations/create_whatsapp_webhook_tables.sql
```

### 2. Configure Webhook URL

**Option A: Automatic (recommended)**
```bash
node setup-whatsapp-webhook.mjs
# Enter your production webhook URL
```

**Option B: Manual via API**
```bash
curl -X PUT "https://wasenderapi.com/api/whatsapp-sessions/YOUR_SESSION_ID" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "webhook_url": "https://your-domain.com/api/whatsapp/webhook",
    "webhook_events": [
      "messages.received",
      "messages.update",
      "messages.reaction",
      "session.status",
      "call.received",
      "poll.results"
    ],
    "webhook_enabled": true
  }'
```

### 3. Test Webhook

```bash
# Test health endpoint
curl https://your-domain.com/api/whatsapp/webhook/health

# Expected response:
{
  "status": "healthy",
  "service": "whatsapp-webhook",
  "uptime": 123,
  "environment": "production",
  "supabaseConfigured": true
}
```

### 4. Send Test Message

1. Send a WhatsApp message to your business number
2. Check logs:
   ```bash
   # Railway
   railway logs
   
   # Heroku
   heroku logs --tail
   
   # PM2
   pm2 logs
   ```

3. Verify in database:
   ```sql
   SELECT * FROM whatsapp_incoming_messages 
   ORDER BY created_at DESC LIMIT 5;
   ```

---

## 📊 Monitoring & Maintenance

### Health Checks

**Endpoint:** `GET https://your-domain.com/api/whatsapp/webhook/health`

**Monitor:**
- Response time (should be <200ms)
- Uptime percentage
- Error rates

**Tools:**
- [UptimeRobot](https://uptimerobot.com/) - Free monitoring
- [Pingdom](https://www.pingdom.com/)
- [StatusCake](https://www.statuscake.com/)

### View Webhook Statistics

```sql
-- Total messages received
SELECT COUNT(*) FROM whatsapp_incoming_messages;

-- Messages by day
SELECT 
  DATE(created_at) as date,
  COUNT(*) as messages
FROM whatsapp_incoming_messages
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Failed webhooks
SELECT * FROM webhook_failures 
WHERE resolved = false
ORDER BY created_at DESC;

-- Customer message counts
SELECT 
  c.name,
  COUNT(*) as message_count
FROM whatsapp_incoming_messages m
JOIN customers c ON m.customer_id = c.id
GROUP BY c.name
ORDER BY message_count DESC
LIMIT 10;
```

### Error Monitoring

**Check failed webhooks:**
```sql
SELECT 
  event_type,
  error_message,
  retry_count,
  created_at
FROM webhook_failures
WHERE resolved = false
ORDER BY created_at DESC;
```

**Resolve failed webhooks:**
```sql
UPDATE webhook_failures
SET resolved = true, resolved_at = NOW()
WHERE id = 'webhook-failure-id';
```

---

## 🔒 Security Best Practices

### 1. Enable Webhook Signature Verification

Set the `WHATSAPP_WEBHOOK_SECRET` environment variable:

```bash
# Generate secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Set in production
export WHATSAPP_WEBHOOK_SECRET=your-generated-secret
```

### 2. Use HTTPS Only

All deployments MUST use HTTPS. WhatsApp requires it.

### 3. Rate Limiting

Already implemented: 1000 requests/minute per IP.

To adjust:
```typescript
// In whatsapp-webhook.ts
const maxRequests = 1000; // Increase if needed
```

### 4. Firewall Rules

Only allow incoming traffic on:
- Port 443 (HTTPS)
- Port 80 (HTTP redirect to HTTPS)

### 5. Database Security

- Use Supabase Row Level Security (RLS)
- Don't expose service role key
- Use read-only keys where possible

---

## 🐛 Troubleshooting Production

### Issue: "Cannot find module '@supabase/supabase-js'"

**Solution:**
```bash
cd server
npm install @supabase/supabase-js
npm run build
# Redeploy
```

### Issue: Webhook not receiving events

**Check:**
1. ✅ Is server running? `curl https://your-domain/health`
2. ✅ Is webhook URL correct in WasenderAPI dashboard?
3. ✅ Is HTTPS working? (required by WhatsApp)
4. ✅ Check server logs for errors
5. ✅ Verify firewall allows incoming connections

### Issue: High error rate

**Check:**
1. Database connection (Supabase status)
2. Environment variables are set
3. Review error logs:
   ```bash
   railway logs --tail
   # or
   heroku logs --tail
   ```

### Issue: Slow response time

**Optimize:**
1. Add database indexes (already done)
2. Enable connection pooling (Supabase does this)
3. Increase server resources
4. Use CDN for static assets

---

## 📈 Scaling

### Horizontal Scaling

Most platforms auto-scale:
- **Railway**: Automatically scales based on load
- **Heroku**: Add more dynos
- **DigitalOcean**: Increase app instances

### Database Scaling

Supabase handles this automatically, but monitor:
- Connection count
- Query performance
- Storage usage

### Caching

Add Redis for high-volume scenarios:
```typescript
// Cache customer lookups
const cachedCustomer = await redis.get(`customer:${phone}`);
```

---

## 🎯 Production Checklist

Before going live:

- [ ] Environment variables set
- [ ] Database migration run
- [ ] HTTPS enabled
- [ ] Webhook URL configured in WasenderAPI
- [ ] Health check passing
- [ ] Test message received and stored
- [ ] Monitoring setup (UptimeRobot, etc.)
- [ ] Error alerting configured
- [ ] Backup strategy in place
- [ ] Documentation updated with production URL
- [ ] Team trained on webhook system

---

## 📞 Production Support

### Webhook URL Format

```
https://your-domain.com/api/whatsapp/webhook
```

### Health Check URL

```
https://your-domain.com/api/whatsapp/webhook/health
```

### Main Server Health

```
https://your-domain.com/health
```

---

## 🎉 You're Production Ready!

Your WhatsApp webhook system is now:
- ✅ Secure (rate limiting, validation, HTTPS)
- ✅ Reliable (error handling, retry logic, monitoring)
- ✅ Scalable (async processing, indexed queries)
- ✅ Observable (health checks, logging, metrics)

**Next:** Deploy, test, and start receiving customer messages! 🚀

