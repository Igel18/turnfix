--- 
description: TurnFix v2.0 - Full-Stack Gymnastics Competition Management System (Node.js/Express/React/PostgreSQL)
---

# TurnFix v2.0 Development Guidelines

**Version**: 2.0 | **Last Updated**: 2025-10-31

## 🎯 Project Overview

**TurnFix** is a modern full-stack web application for managing gymnastics competitions, replacing a legacy Qt/C++ desktop application while maintaining database compatibility.

### Technology Stack
- **Backend**: Node.js 18+, Express, TypeScript, Prisma ORM
- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite
- **Database**: PostgreSQL (legacy schema compatibility required)
- **Process Management**: PM2
- **Platform**: Windows (primary), with cross-platform considerations

### Architecture Principles
- **Backend**: RESTful API with consistent field mapping (camelCase client ↔ snake_case database)
- **Frontend**: Component-based architecture with unified templates and patterns
- **Real-time**: Socket.io for live competition updates
- **Deployment**: Production mode serves frontend from backend (Port 3001)

---

## 📋 Core Development Rules

### Database & Legacy Compatibility
- ✅ **NEVER** modify the database schema
- ✅ **NEVER** change existing database table/column names
- ✅ **KEEP** legacy naming conventions (`var_name`, `int_id`, `bol_flag`, etc.)
- ✅ **MAINTAIN** compatibility with old Qt/C++ application
- ✅ **USE** Prisma for all database operations
- ⚠️ Old `.cpp`, `.h`, `.ui` files are for **reference only** - understand structure, don't modify

### Field Mapping Convention
**All routes must map database fields to client-friendly names:**
```typescript
// Database (snake_case) → Client (camelCase)
int_disziplinenid → id
var_name → name
bol_m → maleAllowed
bol_w → femaleAllowed
```
**Reference**: See `API_ROUTE_MISMATCHES.md` for complete mapping patterns

### Autonomy & Workflow
- ✅ **NO permission needed** to make code changes
- ✅ **NO permission needed** to restart server/client
- ✅ **NO permission needed** to run builds/tests
- ✅ **AUTO-COMMIT** when user says "looks good", "approved", or similar
- ✅ **REAL DATA** available - don't use dummy implementations

### Working Routes (Do Not Modify)
**These Prisma-based routes are working correctly:**
- http://localhost:5173/regions
- http://localhost:5173/associations
- http://localhost:5173/clubs
- http://localhost:5173/participants
- http://localhost:5173/disciplines
- http://localhost:5173/events

---

## 🎨 UI Design System

### Unified Component Architecture

#### Core Templates
1. **EventManagementTemplate.tsx** - Base template for all event-related pages
   - UnifiedPageHeader (title, actions, breadcrumbs)
   - UnifiedDataView (table/card/grid views)
   - UnifiedFilter (consistent filtering)
   - Pagination component

2. **Page Layout Pattern**
   ```tsx
   <div className="max-w-7xl mx-auto p-6">
     {/* All pages use this container */}
   </div>
   ```

#### Component Standards

**Headers**:
- Use `UnifiedPageHeader.tsx` for all pages
- Consistent title, icon, and action button placement

**Data Views**:
- **REQUIRED**: Table view (default)
- **REQUIRED**: Card/Grid view (toggle button)
- **REQUIRED**: View switcher button
- Example: Participants page smart pagination

**Filtering**:
- Use `UnifiedFilter.tsx` component
- Always include "Reset" button
- Filter section always defined (template controls visibility)

**Forms & Dialogs**:
- Follow "Edit Discipline" pattern: Card with form inside
- Use controlled components with proper state management
- Validation with clear error messages

**Info Boxes** (Contextual Help):
- 🔵 **BlueInfoBox**: General information/help
- 🟡 **YellowInfoBox**: Workflow guidance/process steps  
- 🟠 **RosaInfoBox**: Warnings/cautions
- 🔴 **RedInfoBox**: Errors/critical issues

**Tables**:
- Use `Table.tsx` component consistently
- Actions column **always last**
- Show only needed action buttons (modify, delete)
- Consistent field display (e.g., age only, not birthdate)

#### Localization (i18n)
- **ALL UI text must be localized** (no hardcoded strings)
- Use `t('key.path')` from `useTranslation` hook
- Translation files: `client/src/i18n/locales/{de|en}.json`
- Gender values: Use German backend values ('männlich', 'weiblich', 'gemischt')

#### Performance Best Practices
- Load all data, paginate in UI (better search/filter UX)
- Use high API limits when needed
- Smart pagination for large datasets

---

## 🔧 Technical Specifications

### PowerShell Environment
**User runs PowerShell 7+**:
- ❌ **DO NOT** use `&&` for command chaining
- ✅ **USE** `;` (semicolon) instead
- ❌ **DO NOT** use `curl`
- ✅ **USE** PowerShell cmdlets (e.g., `Invoke-WebRequest`)

### Server Configuration

#### Port Configuration
- **Development**:
  - Backend API: Port 3001
  - Frontend (Vite): Port 5173
  - Jury Portal: Port 3002 (standalone)
  
- **Production** (PM2):
  - Main Application: Port 3001 (backend + frontend served together)
  - Jury Portal: Port 3002

**Reference**: `FRONTEND_SERVING_IMPLEMENTATION.md`

#### PM2 Process Management
**Configuration**: `server/ecosystem.config.js`

**Key Settings** (recently optimized):
```javascript
{
  kill_timeout: 10000,      // 10s for graceful shutdown
  restart_delay: 2000,      // 2s before restart
  listen_timeout: 5000,     // 5s for server start
  autorestart: true,        // Auto-restart on crash
  max_restarts: 10          // Prevent restart loop
}
```

**Port Availability**:
- Server auto-kills blocking processes in development mode
- Force-kill enabled via `ensurePortAvailable(port, autoKill, force)`
- See: `server/src/utils/portChecker.ts`, `server/src/index.ts`

### Time Handling 🕐
**CRITICAL**: Local timezone for TIME columns

```typescript
// ✅ CORRECT: Local timezone
const date = new Date(1970, 0, 1, hours, minutes, seconds);
const hours = date.getHours();
const minutes = date.getMinutes();

// ❌ WRONG: UTC conversion causes offset
const date = new Date(`1970-01-01T${time}Z`);
const time = date.toISOString().split('T')[1];
```

**Rationale**: PostgreSQL TIME columns store "wall-clock time" without timezone info. Always use local time methods (`getHours()`, `getMinutes()`) not UTC methods (`toISOString()`).

**Reference**: Point 109 implementation (commit 211334c5)

### Debug Mode
**Enable**: Set `DEBUG=true` in environment variables

**Behavior**:
- Additional console logging (server & client)
- Display database primary keys in UI
- Verbose error messages
- Hidden by default in production

**Implementation**:
```typescript
if (process.env.DEBUG === 'true') {
  console.log('🔍 DEBUG:', data);
}
```

---

## 📊 Data Mapping & Integration

### GymNet XML to TurnFix Mapping

#### Disciplines
```xml
<Discipline name="Boden" m="True" f="False" gymnetid="200" turnfixid="74"/>
<Discipline name="Pferd" m="True" f="False" gymnetid="210" turnfixid="31"/>
<Discipline name="Ringe" m="True" f="False" gymnetid="220" turnfixid="50"/>
<Discipline name="Sprung" m="True" f="False" gymnetid="230" turnfixid="71"/>
<Discipline name="Barren" m="True" f="False" gymnetid="240" turnfixid="72"/>
<Discipline name="Reck" m="True" f="False" gymnetid="250" turnfixid="46"/>
<Discipline name="Sprung" m="False" f="True" gymnetid="260" turnfixid="71"/>
<Discipline name="Stufenbarren" m="False" f="True" gymnetid="270" turnfixid="68"/>
<Discipline name="Schwebebalken" m="False" f="True" gymnetid="280" turnfixid="73"/>
<Discipline name="Boden" m="False" f="True" gymnetid="290" turnfixid="74"/>
<Discipline name="Minitrampolin" m="True" f="True" gymnetid="630" turnfixid="77"/>
<Discipline name="Gerätebahn A" m="True" f="True" gymnetid="915" turnfixid="75"/>
<Discipline name="Gerätebahn B" m="True" f="True" gymnetid="916" turnfixid="76"/>
```

#### Gender Mapping
```xml
<!-- Competition Gender -->
<waGeschlecht>1</waGeschlecht> → TurnFix: male
<waGeschlecht>2</waGeschlecht> → TurnFix: female

<!-- Participant Gender -->
<perGeschlecht>1</perGeschlecht> → TurnFix: male
<perGeschlecht>2</perGeschlecht> → TurnFix: female
```

**Note**: Some disciplines accept both genders (configurable in UI).

### Configuration Management
- ❌ **DO NOT** use hardcoded values in code
- ✅ **USE** database values when possible
- ✅ **USE** configuration files (editable in UI) when database not suitable
- Configuration page: http://localhost:5173/configuration

---

## 🧪 Testing & Quality

### Test Strategy
```bash
# Run all tests with coverage
npm test -- --coverage

# After making changes
npm test
```

**Rules**:
- ✅ Run tests after changes
- ✅ Create new tests for new functionality
- ❌ **NEVER** commit real participant/athlete data
- ❌ **DO NOT** commit test data files

### Build Process
```powershell
# Server
cd server
npm run build

# Client  
cd client
npm run build

# Both (from server directory)
npm run build:all
```

### Code Quality
- **FOR NOW**: Do refactor or clean up existing code. Show in other files which parts of the codebase can be improved.
- **EXCEPTION**: When implementing new features, follow new patterns
- **TEMPORARY FILES**: `*_simple`, `*_debug`, `*_temp` files:
  - Use consistent naming conventions
  - If simple version works better, consider replacing old one
  - Document in code why temporary version exists

**Archive Pattern**: Old/unused files moved to `_archive/` folders (see Point 29 implementation)

---

## 📦 PDF Export

### Implementation
- Use `pdfUtils` functions for PDF generation
- Templates defined in database (`tfx_urkundenlayouts`)
- Field mapping: Use actual field values, not DB column names
- Reference: Certificate Layouts page (http://localhost:5173/certificate-layouts)

---

## 🔄 Live Updates

### Real-time Data Synchronization
- **Socket.io**: For live updates during competitions
- **Cache-Busting**: Client refreshes on data changes
- **Invalidation**: Clear query cache after mutations

**Example**:
```typescript
// After update, invalidate cache
queryClient.invalidateQueries(['/time-planning']);

// Emit socket event (server)
io.emit('competition-updated', { id, data });
```

---

## 🗺️ Project Structure

### Paths
```
Server:  c:\Users\prudlo\source\repos\turnfix\newWebBased\server
Client:  c:\Users\prudlo\source\repos\turnfix\newWebBased\client
```

### Key Directories
```
server/
  src/
    routes/         # API endpoints
    utils/          # Helper functions
    middleware/     # Express middleware
    db/             # Prisma client & connection
  prisma/
    schema.prisma   # Database schema (DO NOT MODIFY)

client/
  src/
    pages/          # Route components
    components/     # Reusable UI components
    i18n/           # Translations (de.json, en.json)
    utils/          # Client utilities
```

---

## 🚨 Critical Learnings from Production

### Issue: Race Conditions in Dialogs
**Problem**: Validation errors showing before data loads (Point 23)

**Solution Pattern**:
```typescript
// ❌ WRONG: Validates immediately
disabled={formData.items.length === 0}

// ✅ CORRECT: Only validates when data loaded
disabled={saving || (items.length > 0 && formData.items.length === 0)}
```

**Reference**: `FIX_DISCIPLINE_VALIDATION.md`

### Issue: Port Blocking on Restart
**Problem**: PM2 restart leaves old process running, blocks port

**Solution** (already implemented):
- Increased `kill_timeout` to 10s
- Force-kill blocking processes in development
- Auto-detection and kill on server start

**Reference**: Point 109 (commit 211334c5)

### Issue: Timezone Offsets
**Problem**: Times saved with UTC, displayed in local time (1-hour offset)

**Solution** (already implemented):
- Use local timezone for ALL time operations
- Never use `toISOString()` for TIME columns
- Use `getHours()`/`getMinutes()` consistently

**Reference**: Point 109 implementation, custom instructions section "Time Zone Handling"

### Issue: Field Mapping Mismatches
**Problem**: API returns database fields, client expects camelCase

**Solution Pattern**:
```typescript
// Backend: Map in SQL query
SELECT 
  int_disziplinenid as id,
  var_name as name,
  bol_m as "maleAllowed"
FROM tfx_disziplinen

// OR: Map in JavaScript
const mapped = {
  id: row.int_disziplinenid,
  name: row.var_name,
  maleAllowed: row.bol_m
};
```

**Reference**: `API_ROUTE_MISMATCHES.md`

---

## 📚 Documentation References

### Implementation Guides
- `FRONTEND_SERVING_IMPLEMENTATION.md` - Production deployment
- `API_ROUTE_MISMATCHES.md` - Field mapping patterns  
- `FIX_DISCIPLINE_VALIDATION.md` - Dialog validation patterns
- `FIREWALL_PLATFORM_INFO.md` - Windows-specific features
- `PRIORITY_FIXES_LOG.md` - Complete fix history

### Setup & Deployment
- `setup/windows/SETUP-GUIDE-DE.md` - Windows installation guide
- `PRODUCTION_DEPLOYMENT.md` - Production setup
- `NETWORK_SETUP.md` - Network access configuration

### Development Tracking
- `newWebBased/Instructions.md` - Detailed feature tracking (3200+ lines)
- Point-based system for feature development
- Commit history with meaningful messages

---

## ✅ Commit Guidelines

### When to Commit
**Auto-commit when user says**:
- "looks good"
- "approved"  
- "sieht gut aus"
- "passt"
- Similar affirmative phrases

### Commit Message Format
```
[Action] Point [Number]: [Brief description]

[Detailed description]
- [Change 1]
- [Change 2]
- [Change 3]

Files modified:
- [file1]
- [file2]
```

**Example** (from Point 109):
```
Fix Point 109: Time Planning UI improvements and timezone handling

- Added edit buttons for competition start times with PencilIcon
- Moved "Durchgang hinzufügen" button to header
- Standardized view toggle buttons (Durchgänge, Zeitstrahl, Gantt, Rotation)
- Fixed timezone handling: consistent local timezone for reading and writing
  * Changed from UTC (toISOString) to local time (getHours/getMinutes)
  * Times now save and display correctly without offset
- Improved server restart reliability:
  * Force-kill blocking processes on port 3001 in development
  * Increased PM2 kill_timeout to 10s for graceful shutdown
  * Reduced restart_delay to 2s for faster recovery

Files modified:
- client/src/pages/TimePlanning.tsx
- server/src/routes/competitions.ts
- server/src/routes/timePlanning.ts
- server/src/index.ts
- server/ecosystem.config.js
```

---

## 🎓 Best Practices Summary

### DO ✅
- Map database fields to client-friendly names
- Use EventManagementTemplate for event pages
- Localize ALL UI text
- Use local timezone for TIME columns
- Test after changes
- Write meaningful commit messages
- Use Prisma for database operations
- Follow existing component patterns
- Add debug logging when helpful
- Document complex logic

### DON'T ❌
- Modify database schema
- Use hardcoded values
- Mix age and birthdate displays
- Use UTC for TIME columns
- Commit real participant data
- Use `&&` in PowerShell commands
- Touch working routes without reason
- Modify legacy C++ files
- Ignore TypeScript errors
- Skip localization

---

## 🔍 Troubleshooting Quick Reference

**Port blocked**: Server auto-kills in dev mode, or manually: `taskkill /PID <pid> /F`

**Timezone offset**: Check if using local time methods (`getHours`) not UTC (`toISOString`)

**Field mapping error**: Verify SQL aliases or JavaScript mapping matches client expectations

**Translation missing**: Add keys to both `de.json` and `en.json`

**Build fails**: Check for TypeScript errors, ensure dependencies installed

**PM2 restart loop**: Check logs in `server/logs/`, verify port availability

---

**End of TurnFix v2.0 Development Guidelines**