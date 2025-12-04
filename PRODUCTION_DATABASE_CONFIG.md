# Production Database Configuration

## Production Database URL

**Current Production Database:**
```
postgresql://neondb_owner:npg_vABqUKk73tEW@ep-young-firefly-adlvuhdv-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

**Database Details:**
- **Provider:** Neon PostgreSQL
- **Host:** ep-young-firefly-adlvuhdv-pooler.c-2.us-east-1.aws.neon.tech
- **Database:** neondb
- **User:** neondb_owner
- **Region:** us-east-1 (AWS)
- **SSL Mode:** Required
- **Channel Binding:** Required

## Environment Variables

### For Production Deployment

Set these environment variables in your production environment:

```bash
# Required - Database Connection
DATABASE_URL=postgresql://neondb_owner:npg_vABqUKk73tEW@ep-young-firefly-adlvuhdv-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require

# For Frontend
VITE_DATABASE_URL=postgresql://neondb_owner:npg_vABqUKk73tEW@ep-young-firefly-adlvuhdv-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require

# Environment
NODE_ENV=production
VITE_APP_ENV=production
```

## Files Updated

The following files have been configured with the production database:

1. **`server/api.mjs`** - Backend API server
   - Fallback production database URL when `DATABASE_URL` env var is not set
   
2. **`scripts/setup/setup-env.sh`** - Environment setup script
   - Production configuration template in .env file
   
3. **`deploy-to-railway.sh`** - Railway deployment script
   - Database connection for Railway deployments

## Connection Methods

### Backend (Node.js)

The backend uses the `@neondatabase/serverless` package:

```javascript
import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;
const sql = neon(DATABASE_URL);

// Use sql for queries
const results = await sql`SELECT * FROM products`;
```

### Frontend (Browser)

The frontend uses Neon's WebSocket pooler:

```javascript
import { Pool, neonConfig } from '@neondatabase/serverless';

neonConfig.webSocketConstructor = WebSocket;
const pool = new Pool({ connectionString: DATABASE_URL });

// Use pool for queries
const client = await pool.connect();
const results = await client.query('SELECT * FROM products');
client.release();
```

## Deployment Platforms

### Railway

Use the `deploy-to-railway.sh` script:

```bash
./deploy-to-railway.sh
```

This will automatically set the production database URL in Railway.

### Manual Deployment

Set the `DATABASE_URL` environment variable in your hosting platform:
- **Vercel:** Project Settings → Environment Variables
- **Netlify:** Site Settings → Environment Variables
- **Heroku:** `heroku config:set DATABASE_URL=...`
- **Render:** Dashboard → Environment → Add Variable

## Security Notes

⚠️ **Important Security Considerations:**

1. **Never commit database credentials** to version control
2. **Use environment variables** for all sensitive information
3. **Rotate credentials** regularly
4. **Use connection pooling** to manage database connections efficiently
5. **Enable SSL/TLS** for all database connections (already configured)
6. **Monitor database access** through Neon's dashboard

## Backup and Recovery

- Neon provides automatic backups
- Access backups through: [Neon Console](https://console.neon.tech)
- Point-in-time recovery is available
- Consider setting up additional backup automation

## Monitoring

Monitor your production database:
- **Neon Dashboard:** https://console.neon.tech
- Check connection counts, query performance, and storage usage
- Set up alerts for high connection counts or slow queries

## Troubleshooting

### Connection Issues

If you encounter connection issues:

1. **Verify DATABASE_URL** is correctly set
2. **Check SSL requirements:** Ensure `sslmode=require` is in the connection string
3. **Test connection:** Use `psql` command:
   ```bash
   psql 'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-young-firefly-adlvuhdv-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
   ```

### Performance Issues

If queries are slow:

1. **Check connection pooling** is enabled
2. **Review query plans** in Neon console
3. **Add indexes** for frequently queried columns
4. **Use the pooler endpoint** (already configured)

## Support

- **Neon Support:** https://neon.tech/docs
- **Neon Discord:** https://discord.gg/neon
- **Project Issues:** Create an issue in your repository

---

**Last Updated:** December 3, 2025
**Database Provider:** Neon PostgreSQL
**Configuration Status:** ✅ Production Ready

