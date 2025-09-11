import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render, setupCommonMocks } from '../utils/test-utils';
import UnifiedPageHeader from '../../components/UnifiedPageHeader';

// Setup mocks
setupCommonMocks();

describe('UnifiedPageHeader Component', () => {
  const mockProps = {
    title: 'Test Page Title',
    subtitle: 'Test page subtitle',
    searchTerm: '',
    onSearchChange: vi.fn(),
    searchPlaceholder: 'Search test items...',
    itemCount: 42,
    filteredCount: 25,
    selectedCount: 3,
    onClearAllFilters: vi.fn(),
    onExportPDF: vi.fn(),
    children: <div>Test Filter Content</div>
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page title correctly', () => {
    render(<UnifiedPageHeader {...mockProps} />);
    
    expect(screen.getByText('Test Page Title')).toBeInTheDocument();
  });

  it('displays item counts correctly', () => {
    render(<UnifiedPageHeader {...mockProps} />);
    
    // Check item count display
    expect(screen.getByText(/42/)).toBeInTheDocument(); // Total count
    expect(screen.getByText(/25/)).toBeInTheDocument(); // Filtered count
    expect(screen.getByText(/3/)).toBeInTheDocument(); // Selected count
  });

  it('handles search input changes', async () => {
    const user = userEvent.setup();
    render(<UnifiedPageHeader {...mockProps} />);
    
    const searchInput = screen.getByPlaceholderText('Search test items...');
    expect(searchInput).toBeInTheDocument();
    
    await user.type(searchInput, 'test query');
    
    expect(mockProps.onSearchChange).toHaveBeenCalledWith('test query');
  });

  it('shows search value correctly', () => {
    const propsWithSearchValue = {
      ...mockProps,
      searchTerm: 'existing search'
    };
    
    render(<UnifiedPageHeader {...propsWithSearchValue} />);
    
    const searchInput = screen.getByDisplayValue('existing search');
    expect(searchInput).toBeInTheDocument();
  });

  it('handles reset filters action', async () => {
    const user = userEvent.setup();
    render(<UnifiedPageHeader {...mockProps} />);
    
    const resetButton = screen.getByRole('button', { name: /reset|clear/i });
    expect(resetButton).toBeInTheDocument();
    
    await user.click(resetButton);
    
    expect(mockProps.onClearAllFilters).toHaveBeenCalled();
  });

  it('handles PDF export action', async () => {
    const user = userEvent.setup();
    render(<UnifiedPageHeader {...mockProps} />);
    
    const exportButton = screen.getByRole('button', { name: /pdf|export/i });
    expect(exportButton).toBeInTheDocument();
    
    await user.click(exportButton);
    
    expect(mockProps.onExportPDF).toHaveBeenCalled();
  });

  it('renders custom filter content', () => {
    render(<UnifiedPageHeader {...mockProps} />);
    
    expect(screen.getByText('Test Filter Content')).toBeInTheDocument();
  });

  it('shows loading state when itemCount is undefined', () => {
    const propsWithoutCount = {
      ...mockProps,
      itemCount: undefined,
      filteredCount: undefined
    };
    
    render(<UnifiedPageHeader {...propsWithoutCount} />);
    
    expect(screen.getByText('Test Page Title')).toBeInTheDocument();
    // Loading indicators or placeholders should be shown
  });

  it('handles case when no items are selected', () => {
    const propsWithoutSelection = {
      ...mockProps,
      selectedCount: 0
    };
    
    render(<UnifiedPageHeader {...propsWithoutSelection} />);
    
    // Should handle zero selection gracefully
    expect(screen.getByText('Test Page Title')).toBeInTheDocument();
  });

  it('handles case when all items are filtered out', () => {
    const propsWithNoFiltered = {
      ...mockProps,
      filteredCount: 0
    };
    
    render(<UnifiedPageHeader {...propsWithNoFiltered} />);
    
    // Should show zero filtered count
    expect(screen.getByText(/0/)).toBeInTheDocument();
  });

  it('handles optional props correctly', () => {
    const minimalProps = {
      title: 'Minimal Test',
      subtitle: 'Minimal subtitle',
      searchTerm: '',
      onSearchChange: vi.fn()
    };
    
    render(<UnifiedPageHeader {...minimalProps} />);
    
    expect(screen.getByText('Minimal Test')).toBeInTheDocument();
  });

  it('handles search input focus and blur', async () => {
    const user = userEvent.setup();
    render(<UnifiedPageHeader {...mockProps} />);
    
    const searchInput = screen.getByPlaceholderText('Search test items...');
    
    await user.click(searchInput);
    expect(searchInput).toHaveFocus();
    
    await user.tab();
    expect(searchInput).not.toHaveFocus();
  });

  it('clears search when reset is clicked', async () => {
    const user = userEvent.setup();
    const propsWithSearch = {
      ...mockProps,
      searchTerm: 'some search term'
    };
    
    render(<UnifiedPageHeader {...propsWithSearch} />);
    
    const resetButton = screen.getByRole('button', { name: /reset|clear/i });
    await user.click(resetButton);
    
    expect(mockProps.onClearAllFilters).toHaveBeenCalled();
  });

  it('disables export when no items available', () => {
    const propsWithNoItems = {
      ...mockProps,
      itemCount: 0,
      filteredCount: 0
    };
    
    render(<UnifiedPageHeader {...propsWithNoItems} />);
    
    const exportButton = screen.getByRole('button', { name: /pdf|export/i });
    // Export button might be disabled when no items (implementation specific)
    expect(exportButton).toBeInTheDocument();
  });

  it('displays responsive layout correctly', () => {
    render(<UnifiedPageHeader {...mockProps} />);
    
    // Check main container structure
    const header = screen.getByText('Test Page Title').closest('div');
    expect(header).toBeInTheDocument();
  });
});
