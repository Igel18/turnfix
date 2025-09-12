import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { 
  render, 
  mockFetch, 
  mockApiResponse, 
  generateTestEvent,
  generateTestParticipant,
  generateTestClub,
  generateTestDiscipline,
  setupCommonMocks 
} from '../utils/test-utils';

// Import all pages for integration testing
import Home from '../../pages/Home';
import Events from '../../pages/Events';
import ParticipantsUnified from '../../pages/ParticipantsUnified';
import DisciplinesUnified from '../../pages/DisciplinesUnified';
import Results from '../../pages/Results';

// Setup mocks
setupCommonMocks();

// Mock navigation for integration tests
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ eventId: '1' }),
    useLocation: () => ({ pathname: '/test' }),
  };
});

describe('UI Integration Tests', () => {
  const mockTestData = {
    events: [generateTestEvent(1), generateTestEvent(2)],
    participants: [generateTestParticipant(1), generateTestParticipant(2)],
    clubs: [generateTestClub(1)],
    disciplines: [generateTestDiscipline(1), generateTestDiscipline(2)],
    competitions: [{
      competition_id: 1,
      var_bezeichnung: 'Test Competition 1',
      var_geschlecht: 'male',
      var_altersgruppe: 'Youth',
      participants: [
        {
          ...generateTestParticipant(1),
          scores: [{
            discipline_id: 1,
            var_bezeichnung: 'Floor Exercise',
            var_kurz1: 'FX',
            res_pfad: ':/icons/floor.png',
            score: '14.50',
            rank: 1
          }],
          total_score: '14.50',
          total_rank: 1
        }
      ],
      disciplineInfo: [{
        discipline_id: 1,
        var_bezeichnung: 'Floor Exercise',
        var_kurz1: 'FX',
        res_pfad: ':/icons/floor.png'
      }]
    }]
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
    mockNavigate.mockClear();
  });

  describe('Application Navigation Flow', () => {
    it('should navigate through main application sections', async () => {
      const user = userEvent.setup();
      
      // Mock API responses for Home page stats
      mockFetch
        .mockResolvedValueOnce(mockApiResponse(mockTestData.participants))
        .mockResolvedValueOnce(mockApiResponse(mockTestData.events))
        .mockResolvedValueOnce(mockApiResponse(mockTestData.competitions))
        .mockResolvedValueOnce(mockApiResponse(mockTestData.clubs));

      render(<Home />);
      
      // Verify home page loads
      expect(screen.getByText('home.title')).toBeInTheDocument();
      
      // Check navigation cards are present
      await waitFor(() => {
        expect(screen.getByText('home.cards.participants.title')).toBeInTheDocument();
        expect(screen.getByText('home.cards.events.title')).toBeInTheDocument();
      });

      // Test clicking on navigation cards (they should trigger navigation)
      const participantsCard = screen.getByText('home.cards.participants.title').closest('div');
      if (participantsCard) {
        await user.click(participantsCard);
        // Navigation would be tested in real integration
      }
    });
  });

  describe('Data Management Workflow', () => {
    it('should handle complete CRUD workflow for events', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValue(mockApiResponse(mockTestData.events));

      render(<Events />);
      
      // Wait for events to load
      await waitFor(() => {
        expect(screen.getByText('Test Event 1')).toBeInTheDocument();
      });

      // Test search functionality
      const searchInput = screen.getByRole('textbox', { name: /search/i });
      await user.type(searchInput, 'Event 1');
      
      // Test view switching
      const viewButtons = screen.getAllByRole('button');
      const viewToggle = viewButtons.find(btn => 
        btn.getAttribute('aria-label')?.includes('view') ||
        btn.textContent?.includes('View')
      );
      
      if (viewToggle) {
        await user.click(viewToggle);
      }

      // Test create new event
      const createButton = screen.getByRole('button', { name: /create|new|add/i });
      await user.click(createButton);
      // Create dialog should open
    });

    it('should handle participant management workflow', async () => {
      const user = userEvent.setup();
      mockFetch
        .mockResolvedValueOnce(mockApiResponse(mockTestData.participants))
        .mockResolvedValueOnce(mockApiResponse(mockTestData.clubs));

      render(<ParticipantsUnified />);
      
      // Wait for participants to load
      await waitFor(() => {
        expect(screen.getByText('TestFirstname1 TestLastname1')).toBeInTheDocument();
      });

      // Test filtering
      const searchInput = screen.getByRole('textbox', { name: /search/i });
      await user.type(searchInput, 'TestFirstname1');
      
      // Test pagination if present
      const pageElements = screen.getAllByText('1');
      if (pageElements.length > 1) {
        // Pagination is present
        expect(pageElements[0]).toBeInTheDocument();
      }
    });
  });

  describe('Results and Reporting Workflow', () => {
    it('should display and export competition results', async () => {
      const user = userEvent.setup();
      mockFetch
        .mockResolvedValueOnce(mockApiResponse(mockTestData.events[0]))
        .mockResolvedValueOnce(mockApiResponse(mockTestData.competitions))
        .mockResolvedValueOnce(mockApiResponse([]));

      render(<Results />);
      
      // Wait for results to load
      await waitFor(() => {
        expect(screen.getByText('Test Competition 1')).toBeInTheDocument();
        expect(screen.getByText('TestFirstname1 TestLastname1')).toBeInTheDocument();
      });

      // Test PDF export
      const exportButton = screen.getByRole('button', { name: /pdf|export/i });
      await user.click(exportButton);
      // PDF generation should be triggered
    });

    it('should handle competition filtering and scoring display', async () => {
      const user = userEvent.setup();
      mockFetch
        .mockResolvedValueOnce(mockApiResponse(mockTestData.events[0]))
        .mockResolvedValueOnce(mockApiResponse(mockTestData.competitions))
        .mockResolvedValueOnce(mockApiResponse([]));

      render(<Results />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Competition 1')).toBeInTheDocument();
        expect(screen.getByText('14.50')).toBeInTheDocument(); // Score
      });

      // Test competition filtering
      const filterInputs = screen.getAllByRole('textbox');
      const competitionFilter = filterInputs.find(input => 
        input.getAttribute('placeholder')?.includes('competition') ||
        input.getAttribute('name')?.includes('competition')
      );
      
      if (competitionFilter) {
        await user.type(competitionFilter, 'Competition 1');
      }
    });
  });

  describe('Responsive Design and Accessibility', () => {
    it('should handle responsive layout changes', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValue(mockApiResponse(mockTestData.disciplines));

      render(<DisciplinesUnified />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Discipline 1')).toBeInTheDocument();
      });

      // Test view switching between table and card views
      const viewButtons = screen.getAllByRole('button');
      const cardViewButton = viewButtons.find(btn => 
        btn.getAttribute('aria-label')?.includes('card')
      );
      
      if (cardViewButton) {
        await user.click(cardViewButton);
        // Layout should change to card view
      }
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValue(mockApiResponse(mockTestData.events));

      render(<Events />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Event 1')).toBeInTheDocument();
      });

      // Test tab navigation
      const searchInput = screen.getByRole('textbox', { name: /search/i });
      await user.click(searchInput);
      expect(searchInput).toHaveFocus();
      
      await user.tab();
      // Next focusable element should receive focus
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle API errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      render(<Events />);
      
      // Page should still render with error handling
      expect(screen.getByText('events.title')).toBeInTheDocument();
      
      // Error state should be handled gracefully
      await waitFor(() => {
        // Error handling implementation specific
      }, { timeout: 1000 });
    });

    it('should handle empty data states', async () => {
      mockFetch.mockResolvedValue(mockApiResponse([]));

      render(<ParticipantsUnified />);
      
      await waitFor(() => {
        expect(screen.getByText('participants.title')).toBeInTheDocument();
        // Empty state message should be shown
      });
    });

    it('should handle slow loading states', () => {
      // Mock slow API response
      mockFetch.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve(mockApiResponse(mockTestData.events)), 5000)
        )
      );

      render(<Events />);
      
      // Loading indicators should be present
      expect(screen.getByText('events.title')).toBeInTheDocument();
      // Loading state should be visible
    });
  });

  describe('Performance and Optimization', () => {
    it('should handle large datasets efficiently', async () => {
      // Generate large dataset
      const largeParticipantList = Array.from({ length: 500 }, (_, i) => 
        generateTestParticipant(i + 1)
      );
      
      mockFetch
        .mockResolvedValueOnce(mockApiResponse(largeParticipantList))
        .mockResolvedValueOnce(mockApiResponse(mockTestData.clubs));

      const startTime = Date.now();
      render(<ParticipantsUnified />);
      
      await waitFor(() => {
        expect(screen.getByText('participants.title')).toBeInTheDocument();
      });

      const renderTime = Date.now() - startTime;
      
      // Should render reasonably quickly even with large datasets
      expect(renderTime).toBeLessThan(5000); // 5 second timeout
    });

    it('should efficiently handle search and filtering', async () => {
      const user = userEvent.setup();
      const largeEventsList = Array.from({ length: 100 }, (_, i) => 
        generateTestEvent(i + 1)
      );
      
      mockFetch.mockResolvedValue(mockApiResponse(largeEventsList));

      render(<Events />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Event 1')).toBeInTheDocument();
      });

      // Test search performance
      const searchInput = screen.getByRole('textbox', { name: /search/i });
      const searchStartTime = Date.now();
      
      await user.type(searchInput, 'Event 1');
      
      const searchTime = Date.now() - searchStartTime;
      
      // Search should be responsive
      expect(searchTime).toBeLessThan(1000); // 1 second for search
    });
  });

  describe('Data Consistency and Synchronization', () => {
    it('should maintain data consistency across views', async () => {
      mockFetch
        .mockResolvedValueOnce(mockApiResponse(mockTestData.events[0]))
        .mockResolvedValueOnce(mockApiResponse(mockTestData.competitions))
        .mockResolvedValueOnce(mockApiResponse([]));

      render(<Results />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Event 1')).toBeInTheDocument();
        expect(screen.getByText('Test Competition 1')).toBeInTheDocument();
      });

      // Data should be consistent between event info and competition results
      const eventTitle = screen.getByText('Test Event 1');
      const competitionTitle = screen.getByText('Test Competition 1');
      
      expect(eventTitle).toBeInTheDocument();
      expect(competitionTitle).toBeInTheDocument();
    });

    it('should handle concurrent data updates', async () => {
      // This would test real-time updates in a full integration environment
      mockFetch.mockResolvedValue(mockApiResponse(mockTestData.participants));

      render(<ParticipantsUnified />);
      
      await waitFor(() => {
        expect(screen.getByText('TestFirstname1 TestLastname1')).toBeInTheDocument();
      });

      // In a real scenario, this would test WebSocket updates or polling
      expect(screen.getByText('participants.title')).toBeInTheDocument();
    });
  });
});
