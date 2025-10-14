# TurnFix Production Deployment Guide

## 🚀 Deploying TurnFix with PM2

This guide covers deploying TurnFix in production using PM2 for process management.

## Prerequisites

- ✅ Node.js v18+ installed
- ✅ PostgreSQL 15+ running
- ✅ TurnFix source code cloned
- ✅ Dependencies installed (`npm install`)

## Quick Start

```powershell
# 1. Navigate to server directory
cd newWebBased/server

# 2. Build TypeScript
npm run build

# 3. Start with PM2 (production mode)
npm run pm2:start:prod

# 4. Verify it's running
npm run pm2:status
```

**That's it!** Your server is now running with automatic restart on crashes.

---

## PM2 Management

### Start Server
```powershell
# Production mode
npm run pm2:start:prod

# Development mode (with NODE_ENV=development)
npm run pm2:start
```

### Monitor Server
```powershell
# Check status
npm run pm2:status

# View logs (real-time)
npm run pm2:logs

# Live monitoring dashboard (CPU, Memory)
npm run pm2:monit

# Detailed server info
npx pm2 describe turnfix-server
```

### Control Server
```powershell
# Restart
npm run pm2:restart

# Stop
npm run pm2:stop

# Reload (zero-downtime)
npm run pm2:reload

# Remove from PM2
npm run pm2:delete
```

### Log Management
```powershell
# View last 50 lines
npm run pm2:logs -- --lines 50

# Flush all logs
npm run pm2:flush

# Log locations
# Error log: server/logs/err.log
# Output log: server/logs/out.log
```

---

## Configuration

### PM2 Configuration File

Location: `server/ecosystem.config.js`

```javascript
module.exports = {
  apps: [{
    name: 'turnfix-server',
    script: './dist/index.js',
    instances: 1,
    exec_mode: 'fork',
    
    // Environment variables
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    
    // Restart configuration
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    restart_delay: 4000,
    
    // Memory management
    max_memory_restart: '500M',
    exp_backoff_restart_delay: 100,
    
    // Logging
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true
  }]
};
```

### Environment Variables

Edit `server/.env` for production:

```env
# Environment
NODE_ENV=production
PORT=3001

# Database (with connection pool)
DATABASE_URL="postgresql://user:pass@host:5432/turnfix?connection_limit=20&pool_timeout=10"

# Shutdown timeout (milliseconds)
SHUTDOWN_TIMEOUT=30000

# Security
JWT_SECRET="your-super-secret-key-change-in-production"
JWT_REFRESH_SECRET="your-refresh-secret-key"

# Debugging (set to false in production)
DEBUG=false
```

**Important:** Change all default secrets before deploying!

---

## Features & Capabilities

### Automatic Crash Recovery
- ✅ Server restarts automatically on crash
- ✅ Max 10 restart attempts with exponential backoff
- ✅ Minimum 10s uptime required before considering stable

### Memory Management
- ✅ 500MB memory limit
- ✅ Automatic restart if memory exceeded
- ✅ Exponential backoff between restarts

### Health Monitoring
- ✅ Database connection health check every 60 seconds
- ✅ Automatic reconnection on DB connection loss (5 retries)
- ✅ CPU and memory monitoring via PM2

### Graceful Shutdown
- ✅ SIGTERM/SIGINT handlers
- ✅ Active requests complete before shutdown
- ✅ Socket.IO connections closed properly
- ✅ Database disconnected cleanly
- ✅ 30-second shutdown timeout

### Error Handling
- ✅ Frontend Error Boundaries (React)
- ✅ Uncaught exceptions logged and server restarted
- ✅ Unhandled promise rejections caught
- ✅ Process warnings logged

---

## Monitoring & Debugging

### Real-Time Monitoring
```powershell
# PM2 Dashboard (CPU, Memory, Restarts)
npm run pm2:monit

# Or use PM2 Plus (cloud monitoring)
npx pm2 link <secret> <public>
```

### Check Server Health
```powershell
# Health endpoint
Invoke-RestMethod http://localhost:3001/health

# Test endpoint
Invoke-RestMethod http://localhost:3001/api/test
```

### View Metrics
```powershell
npx pm2 describe turnfix-server
```

Shows:
- CPU usage
- Memory usage
- Heap usage
- Event loop latency
- HTTP request rate
- Restart count

---

## Troubleshooting

### Server Won't Start

**Check logs:**
```powershell
npm run pm2:logs
```

**Common issues:**
1. **Port already in use**
   ```powershell
   # Find process on port 3001
   Get-NetTCPConnection -LocalPort 3001
   # Kill it
   Stop-Process -Id <PID> -Force
   ```

2. **Database connection failed**
   ```powershell
   # Check PostgreSQL service
   Get-Service postgresql-x64-15
   # Restart if needed
   Restart-Service postgresql-x64-15
   ```

3. **Build errors**
   ```powershell
   # Rebuild
   npm run build
   # Check for TypeScript errors
   npx tsc --noEmit
   ```

### High Memory Usage

```powershell
# Check current memory
npx pm2 describe turnfix-server

# If >500MB, server will auto-restart
# Adjust limit in ecosystem.config.js if needed
```

### Server Keeps Restarting

**Check error logs:**
```powershell
Get-Content server/logs/err.log -Tail 50
```

**Common causes:**
- Database connection issues
- Missing environment variables
- Port conflicts
- Memory leaks (check with `pm2 monit`)

### Reset Everything

```powershell
# Stop and remove from PM2
npm run pm2:delete

# Clear logs
npm run pm2:flush

# Rebuild
npm run build

# Start fresh
npm run pm2:start:prod
```

---

## Deployment Checklist

Before deploying to production:

### Security
- [ ] Change all default passwords
- [ ] Update JWT secrets in `.env`
- [ ] Set `DEBUG=false`
- [ ] Configure firewall rules
- [ ] Enable HTTPS (use reverse proxy like nginx)

### Configuration
- [ ] Set `NODE_ENV=production`
- [ ] Configure database connection pool
- [ ] Set appropriate memory limits
- [ ] Configure log rotation

### Testing
- [ ] Run `npm run build` successfully
- [ ] Test PM2 start/stop/restart
- [ ] Verify health endpoint responds
- [ ] Test automatic crash recovery
- [ ] Check memory usage under load

### Monitoring
- [ ] Set up PM2 monitoring
- [ ] Configure log aggregation
- [ ] Set up alerting for crashes
- [ ] Monitor database connections

---

## Advanced: Multiple Instances

For load balancing, run multiple instances:

```javascript
// ecosystem.config.js
{
  instances: 4,  // Or 'max' for auto-detection
  exec_mode: 'cluster'
}
```

**Note:** This requires session affinity for Socket.IO.

---

## Backup & Recovery

### Database Backup
```powershell
# Backup database
pg_dump -U postgres -d turnfix > backup.sql

# Restore
psql -U postgres -d turnfix < backup.sql
```

### Log Backup
```powershell
# Archive logs
Compress-Archive -Path server/logs/* -DestinationPath logs_backup.zip

# Flush after backup
npm run pm2:flush
```

---

## Performance Tuning

### Database Connection Pool

Adjust in `.env`:
```env
DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=20&pool_timeout=10"
```

### Memory Limit

Adjust in `ecosystem.config.js`:
```javascript
max_memory_restart: '1000M'  // 1GB instead of 500MB
```

### Number of Workers

For CPU-intensive tasks:
```javascript
instances: 'max',  // Use all CPU cores
exec_mode: 'cluster'
```

---

## See Also

- [`HARDENING-PLAN.md`](../HARDENING-PLAN.md) - Full hardening strategy
- [`PHASE-1-COMPLETE.md`](../PHASE-1-COMPLETE.md) - Implementation status
- [`PHASE-1-TESTING.md`](../PHASE-1-TESTING.md) - Testing scenarios
- [`ecosystem.config.js`](../server/ecosystem.config.js) - PM2 configuration

---

## Support

For issues or questions:
1. Check [`PHASE-1-TESTING.md`](../PHASE-1-TESTING.md) for common scenarios
2. Review PM2 logs: `npm run pm2:logs`
3. Check server health: `Invoke-RestMethod http://localhost:3001/health`

