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
Use the old cpp, h and ui files in the turnfix folder for reference only. Do not modify them. But understand how the old application works and use the same logic in the new webbased application. (bugs should be fixed in the new application even if they exist in the old application)
- ✅ **USE** Prisma for all database operations
- ⚠️ Old `.cpp`, `.h`, `.ui` files are for **reference only** - understand structure, don't modify
- If create a database abfrage always check in prisma for the correct name of the table and the columns. Do not create new names
- Attention: The Restart of PM2 can take up to 5 minutes because the database connection pool needs to be closed properly and the tcp port is blocked for a long time from windows. Do not reduce the kill_timeout in the ecosystem.config.js file. 
and it should noch be necessary to add the DATABASE_URL to the ecosystem.config.js file because it is already defined in the .env file.

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
### Shared code and logic ###
Shared code and logic should be used across the application. For example, if there is a function that calculates the age of a participant based on their birthdate, this function should be defined in a utility file and used wherever the age needs to be calculated. This ensures consistency and reduces code duplication.
Shared code across server, client and jury-portal should be placed in the `turnfix/newWebbased/shared` folder. This can include utility functions, types, constants, etc. that are used in multiple parts of the application. For example, a function to calculate the age of a participant based on their birthdate could be defined in `shared/utils/ageCalculator.ts` and imported wherever needed.

## 🎨 UI Design System

### Unified Component Architecture
#### Filter Sections
EventParticipants nutzt die ParticipantFilters Komponente, die ein Grid-Layout hat und die Standard-Styles von UnifiedPageHeader verwendet. Die FilterSection soll ein gleiche Styling haben. 

#### Help 
Help content should be provided via a separate section that follows the established design patterns in the application. This includes consistent header styles, and responsive layouts, colour, Icons, and so on. To open the Help section there must be a help button in the page header that toggles the visibility of the Help section.
check example at
http://localhost:3001/time-planning?eventId=59
There should be a template available for all pages.

#### Page views / Pagination
Only a part of the available data should be loaded initially (if a lot of data sets exist). Use
      pagination: {
        total,
        limit: query.limit,
        offset: query.offset,
        hasMore: query.offset + query.limit < total
      }
to provide pagination information to the template.
Then Show pagination controls in the UI using this information.

#### Component Reusability
Always look for existing patterns and components before creating new ones.
eg Gander Badge component is used in multiple places.
eg use UnifiedDialog for all dialogs.
eg use UnifiedFilter for all filter sections.
eg use UnifiedPageHeader for all page headers.
eg use Table component for all tables.
eg use BlueInfoBox, YellowInfoBox, PinkInfoBox, RedInfoBox for info boxes.
eg use Pagination component for pagination.
eg use Card component for cards.
eg use WizardModal component for wizard modals.

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
- In Table View, use sortable columns with clear indicators 
- In Table view, don't mix informations in a column. Only show one type of information in one Column (e.g., Name, start number, club) 


**Filtering**:
- Use `UnifiedFilter.tsx` component
- Always include "Reset" button
- Filter section always defined (template controls visibility)

**Forms & Dialogs**:
- Follow "Edit Discipline" pattern: Card with form inside
- Use controlled components with proper state management
- Validation with clear error messages
- Use `UnifiedDialog.tsx` for all modal dialogs
- Wizard modals should use `WizardModal.tsx` for consistent multi-step flows 

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
- UI text is checked against hardcoded strings in unit test noHardcodedUiStrings.test.ts
- Use `t('key.path')` from `useTranslation` hook
- Translation files: `client/src/i18n/locales/{de|en}.json`
- Gender values: Use German backend values ('männlich', 'weiblich', 'gemischt')

#### Performance Best Practices
- Load all data, paginate in UI (better search/filter UX)
- Use high API limits when needed
- Smart pagination for large datasets

#### Necessary vs Optional UI Fields #### 
- Only show fields that are necessary for the user to see in the UI. Do not show all fields from the database if they are not needed. For example, only show the age of a participant, not their birthdate. Only show the name of a club, not its address or contact information. This keeps the UI clean and focused on what the user needs to know.

#### Necessary database fields ####
- If a field is necessary in the database (e.g. marked as not nullable) for examle the name of a club, then it should be shown in the UI and the field must be marked as required in the UI. If a field is optional in the database (e.g. nullable) then it should be shown as optional in the UI and it should be possible to leave it empty. This ensures consistency between the database and the UI and prevents confusion for the user.
- required fields markt is a red star and optional fields don't have a mark.
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
### Testing Strategy
- Always write tests for new features and bug fixes

## Unit tests ##
- Use Vitest for unit testing of client components and utilities
- Use Jest for unit testing of server components


## Integration tests ##
- Use Vitest for integration testing of API routes and database interactions

## End-to-end tests ##
- Use Playwright for end-to-end testing of critical user flows (e.g., creating a competition, adding participants, generating PDFs, check score input validation, check score input jury-server, check placement of participants, etc.)
- Test files located in `client/e2e/`
- Use `test-runner.js` for running tests in different modes (real, integration, pages, components)
- Use `npm run e2e` to run all end-to-end tests, and `npm run e2e:headed` for debugging with a visible browser
- Check for correct localization, field mapping, and UI behavior in tests
- check for correct sign of fields, field is necessarry, field is not necessarry, field is only
- check for correct handling of edge cases (e.g., missing data, invalid input, etc.)
- folder structure for e2e tests:
e2e/
  setup/
    create-event.setup.ts       # ← Event A: via API erstellen (immer gleiche Daten)
    import-event.setup.ts       # ← Event B: via GymNet-XML Import
  fixtures/
    test-data.ts                # Konstanten: Namen, Scores, erwartete Ergebnisse
    state.ts                    # Typen + Lade-Helfer für gespeicherten State
  tests/
    score-entry.spec.ts         # Nutzt Event A oder B
    results.spec.ts             # Prüft Platzierungen
    navigation.spec.ts          # UI-Navigation

- Always check the tests after making changes to ensure that existing functionality is not broken and that new features are properly covered by tests. This is critical for maintaining the stability and reliability of the application as it evolves. 
- E2E tests take a long time to run, so unit and integration tests should be written to cover as much logic as possible, and E2E tests should focus on critical user flows and edge cases.

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

### Separation of Concerns (SoC) - Point 122
**File Size Guidelines**:
- ✅ **< 200 lines**: Perfect, no action needed
- ✅ **200-400 lines**: OK, consider splitting if logical
- ⚠️ **400-800 lines**: Should be refactored
- ❌ **> 800 lines**: Must be refactored immediately
- 🚨 **> 1500 lines**: Critical, urgent refactoring required

**Standard Structure for Large Pages**:
```
pages/
└── PageName/
    ├── index.tsx                    (Main Component, ~200-300 lines)
    ├── PageName.types.ts            (TypeScript interfaces/types)
    ├── components/                  (Page-specific components)
    │   ├── ComponentA.tsx          (~150-300 lines each)
    │   ├── ComponentB.tsx
    │   └── ComponentC.tsx
    └── hooks/                       (Page-specific custom hooks)
        ├── usePageData.ts          (~150-250 lines each)
        ├── usePageFilters.ts
        └── usePageValidation.ts
```
**When refactoring large files**: 
Use the previous code snipet because it works well to separate concerns.


**When to Split**:
1. **Types**: Always extract when > 5 interfaces
2. **Hooks**: Extract data fetching, filtering, validation logic
3. **Components**: Extract forms, tables, dialogs > 150 lines
4. **Utils**: Extract helper functions used multiple times
In folder turnfix/newWebbased/cliend/src/utils for client 
in folder turnfix/newWebbased/server/src/utils for Server 
And use them as well. 

**Benefits**:
- ✅ Better maintainability and readability
- ✅ Easier testing (unit test individual pieces)
- ✅ Better code reusability
- ✅ Fewer merge conflicts in team work
- ✅ Easier code reviews

**Example**: EventParticipants.tsx (1936 lines) → Split into 11 focused files averaging ~180 lines each

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

**Test**
Always use the TurnFix-Manager.bat to start the server to identify further issues.

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

### General Guides
- documentations must be located in the `turnfix/documentation/newWebbased` folder
- pictures of the UI are located in `turnfix/documentation/newWebbased/images/ui-screenshots`


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
- don't add documentation to the instrucons.md. Only use it for feature tracking.

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
- Add debug logging when helpful and keep them behind DEBUG flag (don't delete the debug logs) do not use process.env.NODE_ENV. Use debug.ts instead. 
- Document complex logic
- **Apply SoC (Separation of Concerns)** for files > 400 lines
- Write small modular functions which can be reused across components 
- Use separate components for complex UI parts
- Use separate types files (e.g. `PageName.types.ts`)
- Extract custom hooks for data fetching, filtering, validation
- Write small modular functions which can be reused across components 
- use separate components for complex UI parts
- use sepaerate types files (e.g. ScoreCapture.types.ts)
- use same icons across the application for the same actions (e.g. pencil icon for edit, trash icon for delete, etc.)
- Use the same patterns for similar features (e.g. edit discipline, edit club, edit participant, etc.)
- Use the same patterns for similar UI elements (e.g. filter sections, page headers, dialogs, etc.)
- Use the same patterns for similar workflows (e.g. creating a new entity, editing an existing entity, deleting an entity, etc.)
- Use the same patterns for similar data handling (e.g. field mapping, error handling, loading states, etc.)
- Use the same patterns for similar API interactions (e.g. fetching data, updating data, deleting data, etc.)
- Use the same patterns for similar UI interactions (e.g. button placement, form layout, etc.)
- Use the same patterns for similar user flows (e.g. creating a new competition, adding participants, generating PDFs, etc.)  

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



