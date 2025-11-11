/**
 * UnifiedAssignmentModal Types
 * Generic type definitions for reusable M:N assignment UI
 * Supports: Squads, Groups, Teams, Judges, Coaches, EventParticipants
 */

// Base types for master entities (left column)
export interface BaseMasterItem {
  id: number | string;
  name: string;
  isVirtual?: boolean;
  hints?: {
    storage?: string;
    [key: string]: any;
  };
}

// Base types for available items (middle column)
export interface BaseAvailableItem {
  id: number | string;
  firstname?: string;
  lastname?: string;
  name?: string;
  displayName?: string;
}

// Base types for assignments
export interface BaseAssignment {
  masterId: number | string;
  itemId: number | string;
  metadata?: Record<string, any>;
}

// Configuration for the assignment UI
export interface AssignmentConfig<
  TMaster extends BaseMasterItem,
  TAvailable extends BaseAvailableItem
> {
  // Entity names for translations
  entityNames: {
    master: string;          // e.g., "Squad", "Group", "Team"
    available: string;       // e.g., "Participant", "Athlete"
    masterPlural: string;    // e.g., "Squads", "Groups", "Teams"
    availablePlural: string; // e.g., "Participants", "Athletes"
  };

  // Icons
  icons?: {
    master?: React.ComponentType<{ className?: string }>;
    available?: React.ComponentType<{ className?: string }>;
    empty?: React.ComponentType<{ className?: string }>;
  };

  // Display functions (optional - defaults to metadata-based rendering)
  renderMasterItem?: (item: TMaster) => React.ReactNode;
  renderAvailableItem?: (item: TAvailable) => React.ReactNode;
  renderDetailPane?: (item: TMaster) => React.ReactNode;

  // Master item metadata
  getMasterMetadata: (item: TMaster) => {
    itemCount: number;
    subtitle?: string;
    tags?: Array<{ label: string; color?: string }>;
    isVirtual?: boolean;
  };

  // Available item metadata
  getAvailableMetadata: (item: TAvailable) => {
    subtitle?: string;
    tags?: Array<{ label: string; color?: string; isHighlighted?: boolean }>;
  };

  // Filtering
  filterAvailableItems?: (items: TAvailable[], filters: FilterState) => TAvailable[];
  filterMasterItems?: (items: TMaster[], searchTerm: string) => TMaster[];  // NEW: Column filter for master items
  filterConfig?: FilterConfig;

  // Callbacks
  onAssign: (availableItem: TAvailable, masterId: number | string) => Promise<void>;
  onUnassign: (masterId: number | string, itemId: number | string) => Promise<void>;
  onCreateMaster?: () => void;
  onEditMaster?: (master: TMaster) => void; // NEW: Edit master item
  onDeleteMaster?: (masterId: number | string) => Promise<void>;
  onExportPDF?: () => void;

  // Feature flags
  features?: {
    allowCreate: boolean;
    allowDelete: boolean;
    allowExport: boolean;
    showFilters: boolean;
    showSearch: boolean;
    supportsVirtual: boolean;
  };
}

// Filter configuration
export interface FilterConfig {
  fields: FilterField[];
}

export interface FilterField {
  key: string;
  label: string;
  type: 'text' | 'select' | 'multiselect';
  options?: Array<{ value: string; label: string }>;
}

export interface FilterState {
  searchTerm: string;
  columnSearches?: {
    master?: string;      // Column 1: Master items search
    available?: string;   // Column 2: Available items search
    assigned?: string;    // Column 3: Assigned items search
  };
  [key: string]: any;
}

// Props for the main modal component
export interface UnifiedAssignmentModalProps<
  TMaster extends BaseMasterItem,
  TAvailable extends BaseAvailableItem,
  TAssignment extends BaseAssignment
> {
  // Data
  masterItems: TMaster[];
  availableItems: TAvailable[];
  assignments: TAssignment[];

  // Configuration
  config: AssignmentConfig<TMaster, TAvailable>;

  // Loading state
  isLoading?: boolean;

  // Event context (optional)
  eventId?: string | null;

  // External selection control (optional)
  // If provided, component uses controlled mode instead of internal state
  selectedMaster?: TMaster | null;
  onSelectMaster?: (item: TMaster | null) => void;

  // Column-specific search configurations (optional)
  columnSearchPlaceholders?: {
    master?: string;      // Placeholder for column 1 search
    available?: string;   // Placeholder for column 2 search
    assigned?: string;    // Placeholder for column 3 search
  };
}

// Column-specific props
export interface MasterListProps<TMaster extends BaseMasterItem> {
  items: TMaster[];
  selectedItem: TMaster | null;
  onSelect: (item: TMaster) => void;
  onDelete?: (itemId: number | string) => void;
  onEdit?: (item: TMaster) => void;
  entityName: string;
  getMetadata: (item: TMaster) => {
    itemCount: number;
    subtitle?: string;
    tags?: Array<{ label: string; color?: string }>;
    isVirtual?: boolean;
  };
  // Column search (optional)
  columnSearch?: string;
  onColumnSearchChange?: (value: string) => void;
}

export interface AvailableListProps<TAvailable extends BaseAvailableItem> {
  items: TAvailable[];
  selectedMaster: BaseMasterItem | null;
  onAssign: (item: TAvailable, masterId: number | string) => void;
  entityName: string;
  getMetadata: (item: TAvailable) => {
    subtitle?: string;
    tags?: Array<{ label: string; color?: string; isHighlighted?: boolean }>;
  };
  filters?: FilterState;
  onFilterChange?: (filters: FilterState) => void;
  filterConfig?: FilterConfig;
}

export interface DetailPaneProps<TMaster extends BaseMasterItem> {
  selectedItem: TMaster | null;
  entityName: string;
  renderContent?: (item: TMaster) => React.ReactNode;
}
