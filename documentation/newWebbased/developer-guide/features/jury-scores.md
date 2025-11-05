# Jury Scores Feature Implementation

## Overview
Implemented the "Jury-Wertungen erfassen" (Capture Jury Scores) feature from the legacy Qt application (`chk_jury` checkbox) in the new web-based system.

## Implementation Details

### 1. Backend - Configuration File Based Storage
**File:** `newWebBased/server/config/app-settings.json`
```json
{
  "scoreCapture": {
    "showJuryScores": false,
    "description": "When true, shows individual jury scores in score capture. When false, shows only the total score."
  }
}
```

**API Routes:** `newWebBased/server/src/routes/appSettings.ts`
- `GET /api/app-settings` - Get all settings
- `GET /api/app-settings/:category` - Get settings for a specific category
- `PUT /api/app-settings/:category` - Update entire category
- `PATCH /api/app-settings/:category/:setting` - Update single setting

### 2. Frontend - Score Capture Integration
**File:** `newWebBased/client/src/pages/ScoreCapture.tsx`

**Features:**
- Checkbox in the page header: "Jury-Wertungen erfassen"
- State persisted to backend configuration file
- Loads setting on component mount
- Auto-saves on checkbox change

**UI Location:**
- Located below the "Refresh Data" button in the header
- Part of the `customBelowActions` in UnifiedPageHeader

### 3. Localization
**German (de.json):**
```json
"showJuryScores": "Jury-Wertungen erfassen"
```

**English (en.json):**
```json
"showJuryScores": "Capture Jury Scores"
```

## Usage

### API Examples

**Get all settings:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/app-settings"
```

**Get Score Capture settings:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/app-settings/scoreCapture"
```

**Update showJuryScores setting:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/app-settings/scoreCapture/showJuryScores" `
  -Method Patch `
  -Body (@{value=$true} | ConvertTo-Json) `
  -ContentType "application/json"
```

### UI Usage
1. Navigate to Score Capture page
2. Click the "Jury-Wertungen erfassen" checkbox to toggle
3. Setting is automatically saved to the backend
4. Setting persists across browser sessions and server restarts

## Future Enhancement Possibilities

### For Score Capture
When `showJuryScores` is `true`, the UI could:
- Show individual jury member scores in addition to total scores
- Display scoring breakdown by judge
- Allow filtering by specific jury members

### For Jury Portal
The configuration file also includes a `juryPortal.blindMode` setting for future implementation:
- When `true`: Jury members cannot see other judges' scores until they submit their own
- Prevents bias in scoring

## Migration from Qt Application
This implements the exact same functionality as the Qt application's `chk_jury` checkbox:
- **Qt:** `Settings::juryResults` (Boolean in QSettings under `Application/JuryResults`)
- **Web:** `showJuryScores` (Boolean in `config/app-settings.json`)

The web implementation improves on the Qt version by:
- Providing a REST API for external access
- Supporting multiple configuration categories
- Using JSON for human-readable configuration
- No database changes required (file-based like Qt's QSettings)

## Technical Notes
- **No Database Changes:** Uses file-based configuration as requested
- **Type Safety:** TypeScript interfaces for settings
- **Error Handling:** Graceful fallback to defaults if config file is missing or corrupted
- **Performance:** Settings cached in React state, minimal API calls
- **Compatibility:** Works in both Development and Production modes

## Files Modified
1. `server/config/app-settings.json` (new)
2. `server/src/routes/appSettings.ts` (new)
3. `server/src/index.ts` (added route)
4. `client/src/pages/ScoreCapture.tsx`
5. `client/src/i18n/locales/de.json`
6. `client/src/i18n/locales/en.json`
