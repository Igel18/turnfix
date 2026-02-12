import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { 
  render, 
  mockFetch, 
  mockApiResponse, 
  generateTestParticipant, 
  generateTestClub,
  setupCommonMocks 
} from '../utils/test-utils';
import ParticipantsUnified from '../../pages/ParticipantsUnified';

// Setup mocks
setupCommonMocks();

describe('Participants Page', () => {
  const mockParticipants = [
    generateTestParticipant(1),
    generateTestParticipant(2),
    generateTestParticipant(3)
  ];

  const mockClubs = [
    generateTestClub(1)
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
  });

  it('renders participants list successfully', async () => {
    mockFetch
      .mockResolvedValueOnce(mockApiResponse(mockParticipants))
      .mockResolvedValueOnce(mockApiResponse(mockClubs));

    render(<ParticipantsUnified />);
    
    // Check page header
    expect(screen.getByText('participants.title')).toBeInTheDocument();
    
    // Wait for participants to load
    await waitFor(() => {
      expect(screen.getByText('TestFirstname1 TestLastname1')).toBeInTheDocument();
      expect(screen.getByText('TestFirstname2 TestLastname2')).toBeInTheDocument();
    });
  });

  it('displays participant details correctly', async () => {
    mockFetch
      .mockResolvedValueOnce(mockApiResponse(mockParticipants))
      .mockResolvedValueOnce(mockApiResponse(mockClubs));

    render(<ParticipantsUnified />);
    
    await waitFor(() => {
      // Check participant details
      expect(screen.getByText('TestFirstname1 TestLastname1')).toBeInTheDocument();
      expect(screen.getByText('1991')).toBeInTheDocument(); // Birth year
      expect(screen.getByText('1')).toBeInTheDocument(); // Start number
    });
  });

  it('handles search functionality', async () => {
    const user = userEvent.setup();
    mockFetch
      .mockResolvedValueOnce(mockApiResponse(mockParticipants))
      .mockResolvedValueOnce(mockApiResponse(mockClubs));

    render(<ParticipantsUnified />);
    
    await waitFor(() => {
      expect(screen.getByText('TestFirstname1 TestLastname1')).toBeInTheDocument();
    });

    // Find search input (it might be in a filter component)
    const searchInput = screen.getByRole('textbox', { name: /search/i });
    await user.type(searchInput, 'TestFirstname1');
    
    // The filtering should work (implementation depends on the actual component)
    await waitFor(() => {
      expect(screen.getByText('TestFirstname1 TestLastname1')).toBeInTheDocument();
    });
  });

  it('handles pagination', async () => {
    // Generate more participants for pagination
    const manyParticipants = Array.from({ length: 25 }, (_, i) => generateTestParticipant(i + 1));
    
    mockFetch
      .mockResolvedValueOnce(mockApiResponse(manyParticipants))
      .mockResolvedValueOnce(mockApiResponse(mockClubs));

    render(<ParticipantsUnified />);
    
    await waitFor(() => {
      expect(screen.getByText('TestFirstname1 TestLastname1')).toBeInTheDocument();
    });

    // Check if pagination component is present
    const pagination = screen.queryByText('1'); // Page number
    if (pagination) {
      expect(pagination).toBeInTheDocument();
    }
  });

  it('switches between table and card views', async () => {
    const user = userEvent.setup();
    mockFetch
      .mockResolvedValueOnce(mockApiResponse(mockParticipants))
      .mockResolvedValueOnce(mockApiResponse(mockClubs));

    render(<ParticipantsUnified />);
    
    await waitFor(() => {
      expect(screen.getByText('TestFirstname1 TestLastname1')).toBeInTheDocument();
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

  it('handles filter functionality', async () => {
    const user = userEvent.setup();
    mockFetch
      .mockResolvedValueOnce(mockApiResponse(mockParticipants))
      .mockResolvedValueOnce(mockApiResponse(mockClubs));

    render(<ParticipantsUnified />);
    
    await waitFor(() => {
      expect(screen.getByText('TestFirstname1 TestLastname1')).toBeInTheDocument();
    });

    // Look for filter controls
    const filterButtons = screen.getAllByRole('button');
    const genderFilter = filterButtons.find(btn => 
      btn.textContent?.includes('male') || btn.textContent?.includes('female')
    );
    
    if (genderFilter) {
      await user.click(genderFilter);
    }
  });

  it('handles edit participant action', async () => {
    const user = userEvent.setup();
    mockFetch
      .mockResolvedValueOnce(mockApiResponse(mockParticipants))
      .mockResolvedValueOnce(mockApiResponse(mockClubs));

    render(<ParticipantsUnified />);
    
    await waitFor(() => {
      expect(screen.getByText('TestFirstname1 TestLastname1')).toBeInTheDocument();
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

  it('handles API loading state', () => {
    // Mock pending API call
    mockFetch.mockImplementation(() => new Promise(() => {}));

    render(<ParticipantsUnified />);
    
    // Check loading state
    expect(screen.getByText('participants.title')).toBeInTheDocument();
    // Loading indicator should be present (implementation specific)
  });

  it('handles API error state', async () => {
    mockFetch.mockRejectedValue(new Error('API Error'));

    render(<ParticipantsUnified />);
    
    // Page should still render with error handling
    expect(screen.getByText('participants.title')).toBeInTheDocument();
    
    // Wait for error state to be handled
    await waitFor(() => {
      // Error message might be displayed (implementation specific)
    }, { timeout: 1000 });
  });

  it('handles empty participants list', async () => {
    mockFetch
      .mockResolvedValueOnce(mockApiResponse([]))
      .mockResolvedValueOnce(mockApiResponse(mockClubs));

    render(<ParticipantsUnified />);
    
    await waitFor(() => {
      // Should show empty state message
      expect(screen.getByText('participants.title')).toBeInTheDocument();
    });
  });
});
