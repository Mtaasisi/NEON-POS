# 🔗 Database Connection Strings

## Local Database Connection Strings

### Current Local Connection (Active)
```
postgresql://mtaasisi@localhost:5432/neondb
```

### With Explicit Port
```
postgresql://mtaasisi@localhost:5432/neondb
```

### With Password (if you set one)
```
postgresql://mtaasisi:your_password@localhost:5432/neondb
```

### Full Connection String with Options
```
postgresql://mtaasisi@localhost:5432/neondb?sslmode=disable
```

## Connection String Components

```
postgresql://[user]:[password]@[host]:[port]/[database]?[options]
```

- **Protocol:** `postgresql://`
- **User:** `mtaasisi` (your macOS username)
- **Password:** (none by default, or your system password)
- **Host:** `localhost` or `127.0.0.1`
- **Port:** `5432` (PostgreSQL default)
- **Database:** `neondb`
- **Options:** 
  - `sslmode=disable` (for local connections, SSL not needed)

## Usage in Different Contexts

### 1. Environment Variables (.env files)

**Root .env:**
```bash
DATABASE_URL=postgresql://mtaasisi@localhost:5432/neondb
VITE_DATABASE_URL=postgresql://mtaasisi@localhost:5432/neondb
```

**server/.env:**
```bash
DATABASE_URL="postgresql://mtaasisi@localhost:5432/neondb"
```

### 2. Command Line (psql)

```bash
# Using connection string
psql "postgresql://mtaasisi@localhost:5432/neondb"

# Using individual parameters
psql -h localhost -p 5432 -U mtaasisi -d neondb
```

### 3. Node.js/TypeScript

```typescript
// Using postgres library
import postgres from 'postgres';

const sql = postgres('postgresql://mtaasisi@localhost:5432/neondb', {
  ssl: false, // Disable SSL for local
});

// Using Neon serverless
import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://mtaasisi@localhost:5432/neondb');
```

### 4. Python

```python
import psycopg2

conn = psycopg2.connect(
    "postgresql://mtaasisi@localhost:5432/neondb"
)
```

### 5. PHP

```php
$dsn = "pgsql:host=localhost;port=5432;dbname=neondb;user=mtaasisi";
$pdo = new PDO($dsn);
```

### 6. Docker Compose

```yaml
environment:
  DATABASE_URL: "postgresql://mtaasisi@localhost:5432/neondb"
```

### 7. Database GUI Tools

**Connection Parameters:**
- **Host:** `localhost`
- **Port:** `5432`
- **Database:** `neondb`
- **User:** `mtaasisi`
- **Password:** (leave empty or use system password)
- **SSL Mode:** Disable

## Remote Database Connection Strings (Backup)

### Production Database
```
postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

### Development Database
```
postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

## Quick Reference

### Test Connection
```bash
psql "postgresql://mtaasisi@localhost:5432/neondb" -c "SELECT version();"
```

### List Tables
```bash
psql "postgresql://mtaasisi@localhost:5432/neondb" -c "\dt"
```

### Execute Query
```bash
psql "postgresql://mtaasisi@localhost:5432/neondb" -c "SELECT COUNT(*) FROM customers;"
```

## Connection String Examples by Tool

### pgAdmin
- **Name:** Local NEON-POS Database
- **Host:** `localhost`
- **Port:** `5432`
- **Database:** `neondb`
- **Username:** `mtaasisi`
- **Password:** (empty)

### TablePlus
- **Type:** PostgreSQL
- **Host:** `localhost`
- **Port:** `5432`
- **Database:** `neondb`
- **User:** `mtaasisi`
- **Password:** (empty)

### DBeaver
- **Database Type:** PostgreSQL
- **Host:** `localhost`
- **Port:** `5432`
- **Database:** `neondb`
- **Username:** `mtaasisi`
- **Password:** (empty)

### VS Code Extensions
- **PostgreSQL Extension:** Use connection string directly
- **Database Client Extension:** Use individual parameters

## Security Notes

⚠️ **Important:**
- Local connections don't require SSL (safe for localhost)
- Remote connections require SSL (`sslmode=require`)
- Never commit connection strings with passwords to version control
- Use environment variables for sensitive data

## Troubleshooting

### Connection Refused
```bash
# Check if PostgreSQL is running
brew services list | grep postgresql

# Start PostgreSQL
brew services start postgresql@17
```

### Authentication Failed
```bash
# Check if user exists
psql -h localhost -p 5432 -U mtaasisi -d postgres -c "\du"

# Create user if needed
psql -h localhost -p 5432 -U postgres -c "CREATE USER mtaasisi;"
```

### Database Not Found
```bash
# List databases
psql -h localhost -p 5432 -U mtaasisi -l

# Create database if needed
psql -h localhost -p 5432 -U mtaasisi -d postgres -c "CREATE DATABASE neondb;"
```
