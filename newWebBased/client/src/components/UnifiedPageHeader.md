# UnifiedPageHeader Implementation

This document describes the new UnifiedPageHeader component that provides a consistent header design across all dashboard UI pages based on the Meldematrix template.

## Overview

The UnifiedPageHeader component standardizes the layout and functionality of page headers throughout the application, following the user's request to use the Meldematrix header as a template.

## Features

### Layout Structure
- **Left Side**: Home button + Page title and subtitle
- **Right Side**: Search bar, Filters button, Print button, Export PDF button
- **Below Header**: Add/Import buttons and View toggle (Table/Grid)
- **Event Context**: Blue context bar (only shown on event management UIs)

### Core Functionality
- **Search**: Integrated search bar with clear functionality
- **Filters**: Expandable filter section with customizable options
- **Export Options**: Print and PDF export capabilities
- **Action Buttons**: Add/Import functionality with customizable labels
- **View Toggle**: Switch between table and grid views
- **Event Context**: Shows selected event information for event management pages

## Usage

### Basic Implementation
```tsx
import UnifiedPageHeader from '@/components/UnifiedPageHeader'

<UnifiedPageHeader
  title="Page Title"
  subtitle="Page description"
  searchTerm={searchTerm}
  onSearchChange={setSearchTerm}
  searchPlaceholder="Search items..."
  hasFilters={true}
  showFilters={showFilters}
  onToggleFilters={() => setShowFilters(!showFilters)}
  onClearAllFilters={clearAllFilters}
  showAdd={true}
  onAdd={handleAdd}
  addLabel="Add New Item"
  showViewToggle={true}
  viewMode={viewMode}
  onViewModeChange={setViewMode}
  showEventContext={false} // Set to true for event management UIs
/>
```

### Database Management UI
For database management pages (Clubs, Athletes, etc.):
- `showEventContext={false}` - No blue context bar
- Include search, filters, add/import, view toggle as needed

### Event Management UI
For event management pages (Score Capture, Competition Status, etc.):
- `showEventContext={true}` - Shows blue event context bar
- Include search, filters, and relevant actions

## Implementation Status

### Completed Pages
1. **Meldematrix** - ✅ Updated to use UnifiedPageHeader
2. **Clubs** - ✅ Updated to use UnifiedPageHeader (database management example)
3. **ScoreCapture** - ✅ Updated to use UnifiedPageHeader (event management example)

### Props Interface
```tsx
interface UnifiedPageHeaderProps {
  title: string
  subtitle: string
  
  // Search functionality
  searchTerm?: string
  onSearchChange?: (term: string) => void
  searchPlaceholder?: string
  
  // Filter functionality
  showFilters?: boolean
  onToggleFilters?: () => void
  hasFilters?: boolean
  filterOptions?: FilterOption[]
  selectedFilters?: string[]
  onFilterChange?: (filterType: string, value: string) => void
  onClearAllFilters?: () => void
  
  // Action buttons (right side)
  onPrint?: () => void
  onExportPDF?: () => void
  onExportCSV?: () => void
  showPrint?: boolean
  showExportPDF?: boolean
  showExportCSV?: boolean
  
  // Action buttons (below main header)
  onAdd?: () => void
  onImport?: () => void
  addLabel?: string
  importLabel?: string
  showAdd?: boolean
  showImport?: boolean
  
  // View toggle
  viewMode?: 'table' | 'grid'
  onViewModeChange?: (mode: 'table' | 'grid') => void
  showViewToggle?: boolean
  
  // Event context
  showEventContext?: boolean
  
  // Custom actions
  customActions?: ReactNode
  customBelowActions?: ReactNode
  
  // Total count for display
  totalCount?: number
}
```

## Next Steps

To continue implementing the unified header design across all dashboard UIs:

1. **Update remaining pages**:
   - Participants (event management)
   - Competition Management (event management)
   - Competition Status (event management)
   - Regions, Associations (database management)
   - Sports, Formulas, Discipline Groups (database management)

2. **Remove old UnifiedHeader usage** where replaced

3. **Test functionality** across all updated pages

4. **Ensure consistent behavior** between table/grid views

## Design Consistency

The UnifiedPageHeader ensures:
- Consistent Home button placement and styling
- Unified search bar design and behavior
- Standardized filter interface
- Consistent action button layout
- Proper event context display for event management UIs
- Responsive design across different screen sizes

This implementation follows the user's requirements for a modern, unified interface design based on the successful Meldematrix header pattern.
