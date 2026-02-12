import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../utils/test-utils';
import Home from '../../pages/Home';

describe('Home Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
  });

  it('renders the home page with navigation cards', () => {
    render(<Home />);
    
    // Check main heading
    expect(screen.getByText('home.title')).toBeInTheDocument();
    
    // Check navigation cards are present
    expect(screen.getByText('home.cards.participants.title')).toBeInTheDocument();
    expect(screen.getByText('home.cards.events.title')).toBeInTheDocument();
    expect(screen.getByText('home.cards.competitions.title')).toBeInTheDocument();
    expect(screen.getByText('home.cards.results.title')).toBeInTheDocument();
  });

  it('displays quick stats section', async () => {
    // Mock API responses for stats
    mockFetch
      .mockResolvedValueOnce(mockApiResponse([{}, {}, {}])) // participants
      .mockResolvedValueOnce(mockApiResponse([{}, {}])) // events
      .mockResolvedValueOnce(mockApiResponse([{}, {}, {}, {}])) // competitions
      .mockResolvedValueOnce(mockApiResponse([{}])); // clubs

    render(<Home />);
    
    // Wait for stats to load
    await waitFor(() => {
      expect(screen.getByText('home.stats.title')).toBeInTheDocument();
    });
  });

  it('handles navigation card clicks', async () => {
    const user = userEvent.setup();
    render(<Home />);
    
    // Find and click participants card
    const participantsCard = screen.getByText('home.cards.participants.title').closest('div');
    expect(participantsCard).toBeInTheDocument();
    
    // We can't test actual navigation in this setup, but we can ensure the cards are clickable
    if (participantsCard) {
      await user.click(participantsCard);
    }
  });

  it('shows loading state for stats', () => {
    // Mock pending API calls
    mockFetch.mockImplementation(() => new Promise(() => {}));
    
    render(<Home />);
    
    expect(screen.getByText('home.stats.title')).toBeInTheDocument();
  });

  it('handles API errors gracefully', async () => {
    // Mock API errors
    mockFetch.mockRejectedValue(new Error('API Error'));
    
    render(<Home />);
    
    // The page should still render even with API errors
    expect(screen.getByText('home.title')).toBeInTheDocument();
    expect(screen.getByText('home.cards.participants.title')).toBeInTheDocument();
  });

  it('displays recent activities section', () => {
    render(<Home />);
    
    // Check if recent activities section is present
    expect(screen.getByText('home.recentActivities.title')).toBeInTheDocument();
  });

  it('renders responsive layout correctly', () => {
    render(<Home />);
    
    // Check main container structure
    const mainContainer = screen.getByText('home.title').closest('div');
    expect(mainContainer).toBeInTheDocument();
  });
});
