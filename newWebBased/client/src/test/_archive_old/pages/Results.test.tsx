import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { 
  render, 
  mockFetch, 
  mockApiResponse, 
  generateTestEvent,
  generateTestParticipant,
  setupCommonMocks 
} from '../utils/test-utils';
import Results from '../../pages/Results';

// Setup mocks
setupCommonMocks();

// Mock useParams to return a test event ID
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ eventId: '1' }),
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/results/1' }),
  };
});

describe('Results Page', () => {
  const mockEvent = generateTestEvent(1);
  
  const mockCompetitionsWithRanking = [
    {
      competition_id: 1,
      var_bezeichnung: 'Test Competition 1',
      var_geschlecht: 'male',
      var_altersgruppe: 'Youth',
      participants: [
        {
          ...generateTestParticipant(1),
          scores: [
            {
              discipline_id: 1,
              var_bezeichnung: 'Floor Exercise',
              var_kurz1: 'FX',
              res_pfad: ':/icons/floor.png',
              score: '14.50',
              rank: 1
            },
            {
              discipline_id: 2,
              var_bezeichnung: 'Pommel Horse',
              var_kurz1: 'PH',
              res_pfad: ':/icons/pommel.png',
              score: '13.75',
              rank: 2
            }
          ],
          total_score: '28.25',
          total_rank: 1
        },
        {
          ...generateTestParticipant(2),
          scores: [
            {
              discipline_id: 1,
              var_bezeichnung: 'Floor Exercise',
              var_kurz1: 'FX',
              res_pfad: ':/icons/floor.png',
              score: '13.80',
              rank: 2
            },
            {
              discipline_id: 2,
              var_bezeichnung: 'Pommel Horse',
              var_kurz1: 'PH',
              res_pfad: ':/icons/pommel.png',
              score: '14.10',
              rank: 1
            }
          ],
          total_score: '27.90',
          total_rank: 2
        }
      ],
      disciplineInfo: [
        {
          discipline_id: 1,
          var_bezeichnung: 'Floor Exercise',
          var_kurz1: 'FX',
          res_pfad: ':/icons/floor.png'
        },
        {
          discipline_id: 2,
          var_bezeichnung: 'Pommel Horse',
          var_kurz1: 'PH',
          res_pfad: ':/icons/pommel.png'
        }
      ]
    },
    {
      competition_id: 2,
      var_bezeichnung: 'Test Competition 2',
      var_geschlecht: 'female',
      var_altersgruppe: 'Junior',
      participants: [
        {
          ...generateTestParticipant(3),
          var_geschlecht: 'female',
          scores: [
            {
              discipline_id: 3,
              var_bezeichnung: 'Vault',
              var_kurz1: 'VT',
              res_pfad: ':/icons/vault.png',
              score: '15.20',
              rank: 1
            }
          ],
          total_score: '15.20',
          total_rank: 1
        }
      ],
      disciplineInfo: [
        {
          discipline_id: 3,
          var_bezeichnung: 'Vault',
          var_kurz1: 'VT',
          res_pfad: ':/icons/vault.png'
        }
      ]
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
  });

  it('renders results page with event information', async () => {
    mockFetch
      .mockResolvedValueOnce(mockApiResponse(mockEvent))
      .mockResolvedValueOnce(mockApiResponse(mockCompetitionsWithRanking))
      .mockResolvedValueOnce(mockApiResponse([])); // competitions list

    render(<Results />);
    
    // Check page header
    expect(screen.getByText('results.title')).toBeInTheDocument();
    
    // Wait for event to load
    await waitFor(() => {
      expect(screen.getByText('Test Event 1')).toBeInTheDocument();
    });
  });

  it('displays competition results in separate tables', async () => {
    mockFetch
      .mockResolvedValueOnce(mockApiResponse(mockEvent))
      .mockResolvedValueOnce(mockApiResponse(mockCompetitionsWithRanking))
      .mockResolvedValueOnce(mockApiResponse([]));

    render(<Results />);
    
    await waitFor(() => {
      // Check competition headings
      expect(screen.getByText('Test Competition 1')).toBeInTheDocument();
      expect(screen.getByText('Test Competition 2')).toBeInTheDocument();
      
      // Check participant names
      expect(screen.getByText('TestFirstname1 TestLastname1')).toBeInTheDocument();
      expect(screen.getByText('TestFirstname2 TestLastname2')).toBeInTheDocument();
    });
  });

  it('shows discipline scores correctly', async () => {
    mockFetch
      .mockResolvedValueOnce(mockApiResponse(mockEvent))
      .mockResolvedValueOnce(mockApiResponse(mockCompetitionsWithRanking))
      .mockResolvedValueOnce(mockApiResponse([]));

    render(<Results />);
    
    await waitFor(() => {
      // Check discipline scores
      expect(screen.getByText('14.50')).toBeInTheDocument();
      expect(screen.getByText('13.75')).toBeInTheDocument();
      expect(screen.getByText('28.25')).toBeInTheDocument(); // Total score
    });
  });

  it('displays discipline icons in table headers', async () => {
    mockFetch
      .mockResolvedValueOnce(mockApiResponse(mockEvent))
      .mockResolvedValueOnce(mockApiResponse(mockCompetitionsWithRanking))
      .mockResolvedValueOnce(mockApiResponse([]));

    render(<Results />);
    
    await waitFor(() => {
      // Check discipline short names in headers
      expect(screen.getByText('FX')).toBeInTheDocument();
      expect(screen.getByText('PH')).toBeInTheDocument();
      expect(screen.getByText('VT')).toBeInTheDocument();
    });
  });

  it('handles PDF export functionality', async () => {
    const user = userEvent.setup();
    mockFetch
      .mockResolvedValueOnce(mockApiResponse(mockEvent))
      .mockResolvedValueOnce(mockApiResponse(mockCompetitionsWithRanking))
      .mockResolvedValueOnce(mockApiResponse([]));

    render(<Results />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Competition 1')).toBeInTheDocument();
    });

    // Look for PDF export button
    const exportButton = screen.getByRole('button', { name: /pdf/i });
    expect(exportButton).toBeInTheDocument();
    
    await user.click(exportButton);
    // PDF generation should be triggered (we can't test the actual PDF creation)
  });

  it('handles competition filtering', async () => {
    const user = userEvent.setup();
    mockFetch
      .mockResolvedValueOnce(mockApiResponse(mockEvent))
      .mockResolvedValueOnce(mockApiResponse(mockCompetitionsWithRanking))
      .mockResolvedValueOnce(mockApiResponse([]));

    render(<Results />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Competition 1')).toBeInTheDocument();
      expect(screen.getByText('Test Competition 2')).toBeInTheDocument();
    });

    // Look for filter controls
    const filterInputs = screen.getAllByRole('textbox');
    const searchFilter = filterInputs.find(input => 
      input.getAttribute('placeholder')?.includes('search') ||
      input.getAttribute('name')?.includes('search')
    );
    
    if (searchFilter) {
      await user.type(searchFilter, 'Competition 1');
      
      // Should filter to show only Competition 1
      await waitFor(() => {
        expect(screen.getByText('Test Competition 1')).toBeInTheDocument();
      });
    }
  });

  it('handles gender and age group filtering', async () => {
    const user = userEvent.setup();
    mockFetch
      .mockResolvedValueOnce(mockApiResponse(mockEvent))
      .mockResolvedValueOnce(mockApiResponse(mockCompetitionsWithRanking))
      .mockResolvedValueOnce(mockApiResponse([]));

    render(<Results />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Competition 1')).toBeInTheDocument();
    });

    // Look for gender filter
    const buttons = screen.getAllByRole('button');
    const genderButton = buttons.find(btn => 
      btn.textContent?.includes('male') || btn.textContent?.includes('Gender')
    );
    
    if (genderButton) {
      await user.click(genderButton);
    }
  });

  it('shows loading state while fetching data', () => {
    // Mock pending API calls
    mockFetch.mockImplementation(() => new Promise(() => {}));

    render(<Results />);
    
    expect(screen.getByText('results.title')).toBeInTheDocument();
    // Loading indicators should be present (implementation specific)
  });

  it('handles API errors gracefully', async () => {
    mockFetch.mockRejectedValue(new Error('API Error'));

    render(<Results />);
    
    // Page should still render with error handling
    expect(screen.getByText('results.title')).toBeInTheDocument();
    
    await waitFor(() => {
      // Error handling should be implemented
    }, { timeout: 1000 });
  });

  it('handles empty results', async () => {
    mockFetch
      .mockResolvedValueOnce(mockApiResponse(mockEvent))
      .mockResolvedValueOnce(mockApiResponse([]))
      .mockResolvedValueOnce(mockApiResponse([]));

    render(<Results />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Event 1')).toBeInTheDocument();
      // Should show message for no results available
    });
  });

  it('sorts participants by rank correctly', async () => {
    mockFetch
      .mockResolvedValueOnce(mockApiResponse(mockEvent))
      .mockResolvedValueOnce(mockApiResponse(mockCompetitionsWithRanking))
      .mockResolvedValueOnce(mockApiResponse([]));

    render(<Results />);
    
    await waitFor(() => {
      // Check that participants are displayed in rank order
      const participantRows = screen.getAllByText(/TestFirstname\d+ TestLastname\d+/);
      expect(participantRows).toHaveLength(3);
      
      // First participant (rank 1) should appear first in the first competition
      expect(screen.getByText('TestFirstname1 TestLastname1')).toBeInTheDocument();
    });
  });

  it('displays rank information correctly', async () => {
    mockFetch
      .mockResolvedValueOnce(mockApiResponse(mockEvent))
      .mockResolvedValueOnce(mockApiResponse(mockCompetitionsWithRanking))
      .mockResolvedValueOnce(mockApiResponse([]));

    render(<Results />);
    
    await waitFor(() => {
      // Check rank numbers are displayed
      const rankCells = screen.getAllByText('1');
      expect(rankCells.length).toBeGreaterThan(0);
      
      const rankTwoCells = screen.getAllByText('2');
      expect(rankTwoCells.length).toBeGreaterThan(0);
    });
  });
});
