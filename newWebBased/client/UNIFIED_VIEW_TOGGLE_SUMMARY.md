# Unified View Toggle System Implementation

## Overview
Implemented a unified view toggle system that provides consistent table/card view switching across all management UIs in the TurnFix application.

## Components Created

### 1. ViewToggle Component (`src/components/ViewToggle.tsx`)
- **Purpose**: Reusable component for switching between table and card views
- **Features**: 
  - Small/medium size variants
  - Consistent styling with blue active state
  - Icons from Heroicons (TableCellsIcon, Squares2X2Icon)
- **Usage**: Can be used standalone or integrated into UnifiedHeader

### 2. useViewToggle Hook (`src/hooks/useViewToggle.ts`)
- **Purpose**: Manages view state with localStorage persistence
- **Features**:
  - Persistent storage across sessions
  - Unique keys per page/component
  - Default view configuration
  - Error handling for localStorage issues
- **API**: Returns `{ viewType, handleViewTypeChange }`

### 3. Enhanced UnifiedHeader Component
- **New Props**:
  - `showViewToggle?: boolean` - Enable/disable view toggle
  - `viewType?: ViewType` - Current view type ('table' | 'cards')
  - `onViewTypeChange?: (viewType: ViewType) => void` - View change handler
- **Layout**: View toggle positioned left of Home button
- **Styling**: Small size variant for header integration

## Button Layout in UnifiedHeader
The unified header now follows this button order (right to left):
1. **Primary Action** (Blue) - Add/New functionality  
2. **Secondary Action** (Green) - Import functionality (optional)
3. **Home Button** (Gray) - Navigation to dashboard
4. **View Toggle** (White with blue active) - Table/Card view switching

## Pages Updated

### ✅ Fully Migrated
1. **Clubs.tsx** 
   - Key: 'clubs', Default: 'cards'
   - Integrated with UnifiedHeader
   - Removed duplicate toggle from UnifiedDataView

2. **SquadStatusManagement.tsx**
   - Key: 'squad-status', Default: 'table'  
   - Integrated with UnifiedHeader
   - Replaced manual primaryAction toggle

3. **CertificateLayouts.tsx**
   - Key: 'certificate-layouts', Default: 'cards'
   - Integrated with UnifiedHeader
   - Removed manual view toggle buttons

4. **CompetitionStatusManagement.tsx**
   - Key: 'competition-status', Default: 'table'
   - Integrated with UnifiedHeader
   - Replaced manual primaryAction toggle

### 📝 UnifiedDataView Updates
- Updated to use `ViewType` from ViewToggle component
- Removed duplicate toggle logic (now handled by UnifiedHeader)
- Maintains backward compatibility for standalone usage

## Implementation Pattern

### For New Pages
```tsx
import useViewToggle from '@/hooks/useViewToggle'

export function MyPage() {
  // View toggle with persistence
  const { viewType, handleViewTypeChange } = useViewToggle({ 
    key: 'my-page', 
    defaultView: 'table' // or 'cards'
  })

  return (
    <div className="max-w-7xl mx-auto">
      <UnifiedHeader
        // ... other props
        showViewToggle={true}
        viewType={viewType}
        onViewTypeChange={handleViewTypeChange}
      />
      
      {/* Your content with conditional rendering based on viewType */}
      {viewType === 'table' ? (
        // Table view
      ) : (
        // Cards view  
      )}
    </div>
  )
}
```

### For Existing Pages
1. Import `useViewToggle` hook
2. Replace manual `useState` for view mode
3. Add view toggle props to `UnifiedHeader`
4. Remove any manual view toggle buttons
5. Update view mode references to use `viewType`

## Storage Keys Used
- 'clubs' - Club management page
- 'squad-status' - Squad status management
- 'certificate-layouts' - Certificate layouts  
- 'competition-status' - Competition status management

## Benefits

### 🎯 User Experience
- **Consistent Interface**: Same toggle pattern across all pages
- **Persistent Preferences**: View choice remembered between sessions
- **Unified Placement**: Always in the same location (header)
- **Visual Consistency**: Same styling and behavior

### 🔧 Developer Experience  
- **Reusable Components**: Single implementation, multiple uses
- **Easy Integration**: Add 3 props to existing UnifiedHeader
- **Type Safety**: Full TypeScript support
- **Error Handling**: Graceful localStorage fallbacks

### 🏗️ Maintainability
- **Centralized Logic**: View toggle behavior in one place
- **Consistent Styling**: Changes propagate to all pages
- **Clear API**: Simple hook and component interfaces
- **Documentation**: Clear patterns for future implementations

## Next Steps

### Additional Pages to Migrate
Search for any remaining pages with manual view toggles:
```bash
grep -r "useState.*view" src/pages/
```

### Future Enhancements
- Add animation transitions between view types
- Support for additional view types (list, grid variants)
- Keyboard shortcuts for view switching
- View type indicators in URLs

## Testing
- ✅ View toggle appears in all updated pages
- ✅ Preferences persist across page reloads
- ✅ Default views load correctly
- ✅ localStorage errors handled gracefully
- ✅ UnifiedHeader layout remains consistent

The unified view toggle system is now fully implemented and provides a consistent, persistent, and user-friendly way to switch between table and card views across the entire TurnFix application.
