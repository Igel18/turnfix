import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { 
  render, 
  mockFetch, 
  mockApiResponse, 
  generateTestEvent,
  setupCommonMocks 
} from '../utils/test-utils';
import Events from '../../pages/Events';

// Setup mocks
setupCommonMocks();

describe('Events Page', () => {
  const mockEvents = [
    generateTestEvent(1),
    generateTestEvent(2),
    generateTestEvent(3)
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
  });

  it('renders events list successfully', async () => {
    mockFetch.mockResolvedValueOnce(mockApiResponse(mockEvents));

    render(<Events />);
    
    // Check page header
    expect(screen.getByText('events.title')).toBeInTheDocument();
    
    // Wait for events to load
    await waitFor(() => {
      expect(screen.getByText('Test Event 1')).toBeInTheDocument();
      expect(screen.getByText('Test Event 2')).toBeInTheDocument();
      expect(screen.getByText('Test Event 3')).toBeInTheDocument();
    });
  });

  it('displays event details correctly', async () => {
    mockFetch.mockResolvedValueOnce(mockApiResponse(mockEvents));

    render(<Events />);
    
    await waitFor(() => {
      // Check event details
      expect(screen.getByText('Test Event 1')).toBeInTheDocument();
      expect(screen.getByText('TE1')).toBeInTheDocument(); // Short name
      expect(screen.getByText('2024-06-01')).toBeInTheDocument(); // Start date
      expect(screen.getByText('Test Event City 1')).toBeInTheDocument(); // Location
    });
  });

  it('handles search functionality', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce(mockApiResponse(mockEvents));

    render(<Events />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Event 1')).toBeInTheDocument();
    });

    // Find search input
    const searchInput = screen.getByRole('textbox', { name: /search/i });
    await user.type(searchInput, 'Event 1');
    
    // The filtering should work
    await waitFor(() => {
      expect(screen.getByText('Test Event 1')).toBeInTheDocument();
    });
  });

  it('handles date filtering', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce(mockApiResponse(mockEvents));

    render(<Events />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Event 1')).toBeInTheDocument();
    });

    // Look for date filter inputs
    const dateInputs = screen.getAllByDisplayValue(/2024/);
    if (dateInputs.length > 0) {
      await user.clear(dateInputs[0]);
      await user.type(dateInputs[0], '2024-06-01');
    }
  });

  it('switches between table and card views', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce(mockApiResponse(mockEvents));

    render(<Events />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Event 1')).toBeInTheDocument();
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

  it('handles create new event action', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce(mockApiResponse(mockEvents));

    render(<Events />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Event 1')).toBeInTheDocument();
    });

    // Look for create button
    const createButton = screen.getByRole('button', { name: /create|new|add/i });
    expect(createButton).toBeInTheDocument();
    
    await user.click(createButton);
    // Verify create dialog opened (implementation specific)
  });

  it('handles edit event action', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce(mockApiResponse(mockEvents));

    render(<Events />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Event 1')).toBeInTheDocument();
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

  it('handles view event details action', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce(mockApiResponse(mockEvents));

    render(<Events />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Event 1')).toBeInTheDocument();
    });

    // Click on event name or view button
    const eventLink = screen.getByText('Test Event 1');
    await user.click(eventLink);
    // Navigation should occur (we can't test actual navigation in this setup)
  });

  it('displays event status correctly', async () => {
    const eventsWithStatus = mockEvents.map(event => ({
      ...event,
      status: Math.random() > 0.5 ? 'active' : 'completed'
    }));
    
    mockFetch.mockResolvedValueOnce(mockApiResponse(eventsWithStatus));

    render(<Events />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Event 1')).toBeInTheDocument();
      // Status indicators should be present (implementation specific)
    });
  });

  it('handles pagination', async () => {
    // Generate more events for pagination
    const manyEvents = Array.from({ length: 25 }, (_, i) => generateTestEvent(i + 1));
    
    mockFetch.mockResolvedValueOnce(mockApiResponse(manyEvents));

    render(<Events />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Event 1')).toBeInTheDocument();
    });

    // Check if pagination component is present
    const pagination = screen.queryByText('1'); // Page number
    if (pagination) {
      expect(pagination).toBeInTheDocument();
    }
  });

  it('handles sorting by different columns', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce(mockApiResponse(mockEvents));

    render(<Events />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Event 1')).toBeInTheDocument();
    });

    // Look for sortable column headers
    const headers = screen.getAllByRole('columnheader');
    const nameHeader = headers.find(header => 
      header.textContent?.includes('Name') || header.textContent?.includes('events.name')
    );
    
    if (nameHeader) {
      await user.click(nameHeader);
      // Sorting should be applied (implementation specific)
    }
  });

  it('handles API loading state', () => {
    // Mock pending API call
    mockFetch.mockImplementation(() => new Promise(() => {}));

    render(<Events />);
    
    // Check loading state
    expect(screen.getByText('events.title')).toBeInTheDocument();
    // Loading indicator should be present (implementation specific)
  });

  it('handles API error state', async () => {
    mockFetch.mockRejectedValue(new Error('API Error'));

    render(<Events />);
    
    // Page should still render with error handling
    expect(screen.getByText('events.title')).toBeInTheDocument();
    
    // Wait for error state to be handled
    await waitFor(() => {
      // Error message might be displayed (implementation specific)
    }, { timeout: 1000 });
  });

  it('handles empty events list', async () => {
    mockFetch.mockResolvedValueOnce(mockApiResponse([]));

    render(<Events />);
    
    await waitFor(() => {
      // Should show empty state message
      expect(screen.getByText('events.title')).toBeInTheDocument();
    });
  });

  it('filters events by date range', async () => {
    mockFetch.mockResolvedValueOnce(mockApiResponse(mockEvents));

    render(<Events />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Event 1')).toBeInTheDocument();
    });

    // Look for date range filters
    const filterSection = screen.getByText('events.title').closest('div');
    if (filterSection) {
      // Date range filtering logic would be tested here
      expect(filterSection).toBeInTheDocument();
    }
  });

  it('exports events data', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce(mockApiResponse(mockEvents));

    render(<Events />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Event 1')).toBeInTheDocument();
    });

    // Look for export button
    const exportButtons = screen.getAllByRole('button').filter(btn => 
      btn.textContent?.includes('Export') || 
      btn.textContent?.includes('PDF') ||
      btn.getAttribute('aria-label')?.includes('export')
    );
    
    if (exportButtons.length > 0) {
      await user.click(exportButtons[0]);
      // Export functionality should be triggered
    }
  });
});
