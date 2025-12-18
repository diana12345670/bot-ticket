# Railway Deployment Guide

## Environment Variables Required

```
DISCORD_BOT_TOKEN=your_token
DATABASE_URL=your_database_url
OPENAI_API_KEY=optional
NODE_ENV=production
PORT=8080
```

## Features Implemented

### ✅ Error Handling
- VIP error treatment with detailed logging
- Global error handler middleware
- Unhandled rejection and exception catching
- Database error tracking with codes
- API error standardization

### ✅ Logging System
- Multi-level logging (info, warn, error, debug, trace, critical)
- Colored terminal output for Railway
- Request tracking with unique IDs
- Performance metrics on all operations
- Startup/shutdown phase tracking
- Global unhandled error catching

### ✅ Database
- Automatic schema initialization on startup
- Connection retry with exponential backoff
- Connection pooling (20 max connections)
- Table existence verification
- Index creation for performance

### ✅ Railway Compatibility
- Health check endpoint `/health` and `/`
- Graceful shutdown on SIGTERM/SIGINT
- Proper port binding (default 8080)
- Request timeouts (30s)
- Request ID tracking
- Structured error responses

### ✅ Discord Bot
- Fixed deprecation warnings (ready → clientReady)
- Comprehensive error handling on all interactions
- Guild sync with error tracking
- AI response error handling
- Webhook error management
- Ticket operation safeguards

## Startup Flow

1. Database connection test with retries
2. Database schema initialization
3. Routes registration
4. Vite setup (dev) or static serve (prod)
5. Server binding to port
6. Discord bot connection

## Monitoring

Check logs for:
- `[STARTUP]` phases
- `[ERROR]` errors with codes
- `[DB]` database operations
- `[DISCORD]` bot events
- `[API]` request details

All errors are logged with:
- Stack traces (dev mode)
- Request IDs
- Error codes
- Detailed context
