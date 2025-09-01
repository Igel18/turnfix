# UnifiedHeader Template

This template shows the correct structure for unified headers across all database management UIs.

## Template Usage

```tsx
import UnifiedHeader, { StateInfo } from '@/components/UnifiedHeader'
import { 
  HomeIcon,      // For home button (automatic in UnifiedHeader)
  PlusIcon,      // For primary action (Add/New)
  ArrowUpTrayIcon // For secondary action (Import) - optional
} from '@heroicons/react/24/outline'

// In your component JSX:
<UnifiedHeader
  title="[Page] Management"
  description="Manage [entities] ([count] [entities] loaded)"
  icon={YourIcon}
  
  // State info badges (optional)
  stateInfo={getStateInfo()}
  selectedState={selectedStatus}
  onStateChange={setSelectedStatus}
  
  // Search functionality
  searchTerm={searchTerm}
  onSearchChange={setSearchTerm}
  searchPlaceholder="Search [entities]..."
  
  // Filter options (optional)
  filterOptions={getFilterOptions()}
  onClearAllFilters={handleClearAllFilters}
  onExportCSV={handleExportCSV}
  
  // REQUIRED: Home button (top right, gray)
  showHomeButton={true}
  homeUrl="/dashboard"
  
  // OPTIONAL: Secondary action (top right, green) - Import
  secondaryAction={{
    label: 'Import [Entities]',
    icon: ArrowUpTrayIcon,
    onClick: () => setShowImportModal(true)
  }}
  
  // REQUIRED: Primary action (top right, blue) - Add/New
  primaryAction={{
    label: 'Add [Entity]',
    icon: PlusIcon,
    onClick: () => setIsModalOpen(true)
  }}
  
  // Count info
  totalCount={filteredEntities.length}
/>
```

## Button Order (Right to Left)
1. **Primary Action** (Blue) - Add/New button
2. **Secondary Action** (Green) - Import button (optional)  
3. **Home Button** (Gray) - Always present

## Key Points
- Home button should ALWAYS be present (`showHomeButton={true}`)
- Primary action should be for Add/New functionality
- Secondary action is optional and typically for Import
- Don't add action buttons outside the header component
- Use consistent naming: "[Entity] Management" for titles
