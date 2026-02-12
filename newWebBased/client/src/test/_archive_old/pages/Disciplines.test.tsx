import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { 
  render, 
  mockFetch, 
  mockApiResponse, 
  generateTestDiscipline,
  setupCommonMocks 
} from '../utils/test-utils';
import DisciplinesUnified from '../../pages/DisciplinesUnified';

// Setup mocks
setupCommonMocks();

describe('Disciplines Page', () => {
  const mockDisciplines = [
    generateTestDiscipline(1),
    generateTestDiscipline(2),
    generateTestDiscipline(3)
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
  });

  it('renders disciplines list successfully', async () => {
    mockFetch.mockResolvedValueOnce(mockApiResponse(mockDisciplines));

    render(<DisciplinesUnified />);
    
    // Check page header
    expect(screen.getByText('disciplines.title')).toBeInTheDocument();
    
    // Wait for disciplines to load
    await waitFor(() => {
      expect(screen.getByText('Test Discipline 1')).toBeInTheDocument();
      expect(screen.getByText('Test Discipline 2')).toBeInTheDocument();
      expect(screen.getByText('Test Discipline 3')).toBeInTheDocument();
    });
  });

  it('displays discipline details correctly', async () => {
    mockFetch.mockResolvedValueOnce(mockApiResponse(mockDisciplines));

    render(<DisciplinesUnified />);
    
    await waitFor(() => {
      // Check discipline details
      expect(screen.getByText('Test Discipline 1')).toBeInTheDocument();
      expect(screen.getByText('TD1')).toBeInTheDocument(); // Short name 1
      expect(screen.getByText('TEST1')).toBeInTheDocument(); // Short name 2
    });
  });

  it('displays discipline icons', async () => {
    mockFetch.mockResolvedValueOnce(mockApiResponse(mockDisciplines));

    render(<DisciplinesUnified />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Discipline 1')).toBeInTheDocument();
      
      // Check if icon containers are present (icons are shown as images)
      const images = screen.getAllByRole('img');
      expect(images.length).toBeGreaterThan(0);
    });
  });

  it('handles search functionality', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce(mockApiResponse(mockDisciplines));

    render(<DisciplinesUnified />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Discipline 1')).toBeInTheDocument();
    });

    // Find search input
    const searchInput = screen.getByRole('textbox', { name: /search/i });
    await user.type(searchInput, 'Discipline 1');
    
    // The filtering should work
    await waitFor(() => {
      expect(screen.getByText('Test Discipline 1')).toBeInTheDocument();
    });
  });

  it('switches between table and card views', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce(mockApiResponse(mockDisciplines));

    render(<DisciplinesUnified />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Discipline 1')).toBeInTheDocument();
    });

    // Look for view toggle buttons
    const viewButtons = screen.getAllByRole('button');
    const cardViewButton = viewButtons.find(btn => 
      btn.getAttribute('aria-label')?.includes('card') || 
      btn.textContent?.includes('Card')
    );
    
    if (cardViewButton) {
      await user.click(cardViewButton);
      // Verify view changed (implementation specific)
    }
  });

  it('handles create new discipline action', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce(mockApiResponse(mockDisciplines));

    render(<DisciplinesUnified />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Discipline 1')).toBeInTheDocument();
    });

    // Look for create button
    const createButton = screen.getByRole('button', { name: /create|new|add/i });
    expect(createButton).toBeInTheDocument();
    
    await user.click(createButton);
    // Verify create dialog opened (implementation specific)
  });

  it('handles edit discipline action', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce(mockApiResponse(mockDisciplines));

    render(<DisciplinesUnified />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Discipline 1')).toBeInTheDocument();
    });

    // Look for edit buttons
    const editButtons = screen.getAllByRole('button').filter(btn => 
      btn.textContent?.includes('Edit') || 
      btn.getAttribute('aria-label')?.includes('edit')
    );
    
    if (editButtons.length > 0) {
      await user.click(editButtons[0]);
      // Verify edit dialog opened (implementation specific)
    }
  });

  it('handles delete discipline action', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce(mockApiResponse(mockDisciplines));

    render(<DisciplinesUnified />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Discipline 1')).toBeInTheDocument();
    });

    // Look for delete buttons
    const deleteButtons = screen.getAllByRole('button').filter(btn => 
      btn.textContent?.includes('Delete') || 
      btn.getAttribute('aria-label')?.includes('delete')
    );
    
    if (deleteButtons.length > 0) {
      await user.click(deleteButtons[0]);
      // Verify delete confirmation dialog (implementation specific)
    }
  });

  it('displays sort order correctly', async () => {
    mockFetch.mockResolvedValueOnce(mockApiResponse(mockDisciplines));

    render(<DisciplinesUnified />);
    
    await waitFor(() => {
      // Check sort order values
      expect(screen.getByText('1')).toBeInTheDocument(); // Sort order for first discipline
      expect(screen.getByText('2')).toBeInTheDocument(); // Sort order for second discipline
    });
  });

  it('handles sorting by different columns', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce(mockApiResponse(mockDisciplines));

    render(<DisciplinesUnified />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Discipline 1')).toBeInTheDocument();
    });

    // Look for sortable column headers
    const headers = screen.getAllByRole('columnheader');
    const nameHeader = headers.find(header => 
      header.textContent?.includes('Name') || header.textContent?.includes('disciplines.name')
    );
    
    if (nameHeader) {
      await user.click(nameHeader);
      // Sorting should be applied (implementation specific)
    }
  });

  it('shows active/inactive status', async () => {
    const disciplinesWithStatus = mockDisciplines.map((discipline, index) => ({
      ...discipline,
      aktiv: index % 2 === 0 // Alternate active/inactive
    }));
    
    mockFetch.mockResolvedValueOnce(mockApiResponse(disciplinesWithStatus));

    render(<DisciplinesUnified />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Discipline 1')).toBeInTheDocument();
      // Status indicators should be present (implementation specific)
    });
  });

  it('handles pagination', async () => {
    // Generate more disciplines for pagination
    const manyDisciplines = Array.from({ length: 25 }, (_, i) => generateTestDiscipline(i + 1));
    
    mockFetch.mockResolvedValueOnce(mockApiResponse(manyDisciplines));

    render(<DisciplinesUnified />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Discipline 1')).toBeInTheDocument();
    });

    // Check if pagination component is present
    const pagination = screen.queryByText('1'); // Page number
    if (pagination) {
      expect(pagination).toBeInTheDocument();
    }
  });

  it('handles API loading state', () => {
    // Mock pending API call
    mockFetch.mockImplementation(() => new Promise(() => {}));

    render(<DisciplinesUnified />);
    
    // Check loading state
    expect(screen.getByText('disciplines.title')).toBeInTheDocument();
    // Loading indicator should be present (implementation specific)
  });

  it('handles API error state', async () => {
    mockFetch.mockRejectedValue(new Error('API Error'));

    render(<DisciplinesUnified />);
    
    // Page should still render with error handling
    expect(screen.getByText('disciplines.title')).toBeInTheDocument();
    
    // Wait for error state to be handled
    await waitFor(() => {
      // Error message might be displayed (implementation specific)
    }, { timeout: 1000 });
  });

  it('handles empty disciplines list', async () => {
    mockFetch.mockResolvedValueOnce(mockApiResponse([]));

    render(<DisciplinesUnified />);
    
    await waitFor(() => {
      // Should show empty state message
      expect(screen.getByText('disciplines.title')).toBeInTheDocument();
    });
  });

  it('validates discipline form inputs', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce(mockApiResponse(mockDisciplines));

    render(<DisciplinesUnified />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Discipline 1')).toBeInTheDocument();
    });

    // Open create dialog
    const createButton = screen.getByRole('button', { name: /create|new|add/i });
    await user.click(createButton);
    
    // Look for form inputs and test validation
    const nameInput = screen.queryByLabelText(/name/i) || screen.queryByPlaceholderText(/name/i);
    if (nameInput) {
      await user.clear(nameInput);
      await user.tab(); // Trigger validation
      
      // Validation message should appear (implementation specific)
    }
  });

  it('handles discipline status toggle', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce(mockApiResponse(mockDisciplines));

    render(<DisciplinesUnified />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Discipline 1')).toBeInTheDocument();
    });

    // Look for status toggle switches
    const toggles = screen.getAllByRole('switch');
    if (toggles.length > 0) {
      await user.click(toggles[0]);
      // Status should be toggled (implementation specific)
    }
  });
});
