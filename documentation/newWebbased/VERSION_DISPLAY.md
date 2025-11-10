# Version Display Implementation

## Overview
The TurnFix application now displays **real-time build information** in the header of every page, showing both Frontend (FE) and Backend (BE) Git commit hashes.

## What is displayed?

### Header Display
```
┌─────────────────────────────────────────────┐
│  FE: 755fb5be  │  BE: 755fb5be  │  🌐 DE    │
└─────────────────────────────────────────────┘
```

- **FE (Frontend)**: Git commit hash of the client build
- **BE (Backend)**: Git commit hash of the server build
- **Tooltip**: Hover for detailed build information

### Tooltip Information
**Frontend (Blue)**:
- Git Hash: `755fb5be`
- Branch: `WebInterface`
- Build Date: `10.11.2025, 14:11:21`

**Backend (Green)**:
- Git Hash: `755fb5be`
- Fetched dynamically from `/api/system/version`

## How it works

### 1. Build-Time Generation
Both client and server generate `build-info.json` **before each build**:

**Client**: `client/scripts/generate-build-info.js`
```javascript
// Runs as `prebuild` script in package.json
// Generates: client/src/build-info.json
{
  "gitHash": "755fb5be",
  "gitBranch": "WebInterface",
  "gitCommitDate": "2025-11-10 10:18:53 +0100",
  "buildTimestamp": "2025-11-10T13:11:21.364Z",
  "buildDate": "10.11.2025, 14:11:21"
}
```

**Server**: `server/scripts/generate-build-info.js`
```javascript
// Runs as `prebuild` script in package.json
// Generates: server/src/build-info.json
// (Same structure as client)
```

### 2. Runtime Display

**Frontend** (`UnifiedPageHeader.tsx`):
- Imports `build-info.json` statically (embedded in bundle)
- Fetches backend version from `/api/system/version` on mount
- Displays both versions with color-coded badges

**Backend** (`routes/system.ts`):
- Endpoint: `GET /api/system/version`
- Returns build info + package version + environment

## Build Process

### Manual Build
```powershell
# Client
cd client
npm run build
# → Runs prebuild → Generates build-info.json → Builds with Vite

# Server
cd server
npm run build
# → Runs prebuild → Generates build-info.json → Compiles with tsc
```

### Automated (PM2)
```powershell
cd server
npm run pm2:start:prod
# → Builds client & server → Both generate build-info.json
```

## Git Ignore
`build-info.json` files are **NOT committed** to git:
```
# newWebBased/.gitignore
client/src/build-info.json
server/src/build-info.json
```

**Reason**: These files are **build artifacts** that change with every build.

## API Endpoints

### `GET /api/system/version`
Returns complete server build information.

**Response**:
```json
{
  "version": "1.0.0",
  "name": "turnfix-server",
  "description": "TurnFix Backend API",
  "build": {
    "gitHash": "755fb5be",
    "gitBranch": "WebInterface",
    "gitCommitDate": "2025-11-10 10:18:53 +0100",
    "buildTimestamp": "2025-11-10T13:11:21.364Z",
    "buildDate": "10.11.2025, 14:11:21"
  },
  "environment": "production",
  "nodeVersion": "v18.20.5"
}
```

### `GET /api/system/health`
Simple health check endpoint.

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2025-11-10T13:15:30.123Z",
  "uptime": 1234.567
}
```

## Use Cases

### 1. Production Debugging
**Problem**: User reports issue, but which build are they using?

**Solution**: User can screenshot header or say "I'm on `755fb5be`"

### 2. Deployment Verification
**Problem**: Did the new build actually deploy?

**Solution**: Check header - hash should change after deployment

### 3. Cache Issues
**Problem**: User sees old version after update

**Solution**: 
- FE hash unchanged → Browser cache issue → Hard refresh
- BE hash unchanged → Server not restarted → Restart PM2
- Hashes different → Mismatch → Need full redeploy

### 4. Multi-Environment Testing
**Problem**: Which version is running on staging vs. production?

**Solution**: Compare Git hashes in headers

## Troubleshooting

### "unknown" hash displayed
**Cause**: Git not available when building

**Solution**: Ensure git is in PATH, or accept fallback

### Backend version shows "..." or "error"
**Cause**: API request failed

**Solutions**:
1. Check if server is running
2. Check browser console for network errors
3. Verify `/api/system/version` endpoint works

### Hashes don't match after build
**Normal**: Frontend and backend can have different hashes if built separately

**Expected**: After `npm run build:all`, both should match

## Files Created/Modified

### Created
- `client/scripts/generate-build-info.js` - Build info generator
- `server/scripts/generate-build-info.js` - Build info generator
- `server/src/routes/system.ts` - System info API routes
- `documentation/newWebbased/VERSION_DISPLAY.md` - This file

### Modified
- `client/package.json` - Added `prebuild` script
- `server/package.json` - Added `prebuild` script
- `client/src/components/UnifiedPageHeader.tsx` - Version display UI
- `server/src/index.ts` - Registered `/api/system` routes
- `newWebBased/.gitignore` - Ignore build-info.json files

## Benefits

✅ **Instant Identification**: Know exactly which code is running
✅ **Cache Debugging**: Detect stale builds immediately
✅ **Deployment Tracking**: Verify deployments succeeded
✅ **Support Efficiency**: Users can report exact version
✅ **Multi-Environment**: Compare staging/prod easily
✅ **No Manual Updates**: Auto-generated at build time

## Future Enhancements

### Potential Additions
1. **Full commit message** in tooltip
2. **Build duration** tracking
3. **Dirty flag** (uncommitted changes)
4. **Click to copy** hash to clipboard
5. **Version history** modal
6. **Alert on version mismatch** (FE ≠ BE)

---

**Implementation Date**: 2025-11-10
**Git Hash**: `755fb5be`
**Status**: ✅ Complete and tested
