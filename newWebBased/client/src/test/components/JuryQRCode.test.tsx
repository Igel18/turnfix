/**
 * JuryQRCode Component Tests
 * 
 * Tests the QR code component that displays jury portal URLs
 * fetched from the /api/firewall/network-info endpoint.
 * Uses MSW for API mocking.
 */

import { describe, it, expect, vi, beforeEach, afterEach, afterAll, beforeAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { JuryQRCode } from '../../components/JuryQRCode';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, any>) => {
      const translations: Record<string, string> = {
        'juryQR.title': 'QR-Code Jury-Portal',
        'juryQR.subtitle': 'Kampfrichter können den QR-Code scannen',
        'juryQR.loading': 'Netzwerk-Informationen werden geladen...',
        'juryQR.error': 'Netzwerk-Fehler',
        'juryQR.errorFetching': 'Netzwerk-Informationen konnten nicht abgerufen werden',
        'juryQR.retry': 'Erneut versuchen',
        'juryQR.noNetwork': 'Kein Netzwerk gefunden',
        'juryQR.noNetworkHint': 'Es wurden keine Netzwerkschnittstellen gefunden.',
        'juryQR.networkHint': 'Stellen Sie sicher, dass die Geräte im selben Netzwerk sind.',
        'juryQR.selectNetwork': 'Netzwerk auswählen',
        'juryQR.copyUrl': 'URL kopieren',
        'juryQR.openInBrowser': 'Im Browser öffnen',
        'juryQR.portInfo': `Jury-Portal auf Port ${params?.port || '3002'}`,
        'juryQR.refresh': 'Aktualisieren',
      };
      return translations[key] || key;
    },
    i18n: { language: 'de' },
  }),
}));

const mockNetworkInfoMulti = {
  ipAddresses: ['192.168.1.100', '10.0.0.5'],
  ports: { backend: 3001, frontend: 3001, juryPortal: 3002 },
  accessUrls: {
    backend: ['http://192.168.1.100:3001/api', 'http://10.0.0.5:3001/api'],
    frontend: ['http://192.168.1.100:3001', 'http://10.0.0.5:3001'],
    juryPortal: ['http://192.168.1.100:3002', 'http://10.0.0.5:3002'],
  },
};

const mockNetworkInfoSingle = {
  ipAddresses: ['192.168.1.100'],
  ports: { backend: 3001, frontend: 3001, juryPortal: 3002 },
  accessUrls: {
    backend: ['http://192.168.1.100:3001/api'],
    frontend: ['http://192.168.1.100:3001'],
    juryPortal: ['http://192.168.1.100:3002'],
  },
};

// Default handler — returns multi-IP response
const handlers = [
  http.get('/api/firewall/network-info', () => {
    return HttpResponse.json(mockNetworkInfoMulti);
  }),
];

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('JuryQRCode Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Loading State ---
  it('shows loading state initially', () => {
    // Make the request hang indefinitely
    server.use(
      http.get('/api/firewall/network-info', () => {
        return new Promise(() => {}); // Never resolves
      })
    );
    render(<JuryQRCode />);
    expect(screen.getByText('Netzwerk-Informationen werden geladen...')).toBeInTheDocument();
  });

  // --- Error State ---
  it('shows error when fetch fails', async () => {
    server.use(
      http.get('/api/firewall/network-info', () => {
        return new HttpResponse(null, { status: 500 });
      })
    );
    render(<JuryQRCode />);
    await waitFor(() => {
      expect(screen.getByText('Netzwerk-Fehler')).toBeInTheDocument();
    });
  });

  it('shows retry button on error', async () => {
    server.use(
      http.get('/api/firewall/network-info', () => {
        return new HttpResponse(null, { status: 500 });
      })
    );
    render(<JuryQRCode />);
    await waitFor(() => {
      expect(screen.getByText('Erneut versuchen')).toBeInTheDocument();
    });
  });

  // --- No Network State ---
  it('shows no network message when no IPs found', async () => {
    server.use(
      http.get('/api/firewall/network-info', () => {
        return HttpResponse.json({
          ipAddresses: [],
          ports: { backend: 3001, frontend: 3001, juryPortal: 3002 },
          accessUrls: { backend: [], frontend: [], juryPortal: [] },
        });
      })
    );
    render(<JuryQRCode />);
    await waitFor(() => {
      expect(screen.getByText('Kein Netzwerk gefunden')).toBeInTheDocument();
    });
  });

  // --- Full Mode (default) ---
  it('renders QR codes for each IP in full mode', async () => {
    render(<JuryQRCode />);
    await waitFor(() => {
      expect(screen.getByText('QR-Code Jury-Portal')).toBeInTheDocument();
    });
    // Both IPs should be displayed
    expect(screen.getByText('192.168.1.100')).toBeInTheDocument();
    expect(screen.getByText('10.0.0.5')).toBeInTheDocument();
    // URLs should be shown
    expect(screen.getByText('http://192.168.1.100:3002/jury')).toBeInTheDocument();
    expect(screen.getByText('http://10.0.0.5:3002/jury')).toBeInTheDocument();
    // QR SVG elements should be present
    const svgs = document.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThanOrEqual(2);
  });

  it('shows network hint in full mode', async () => {
    render(<JuryQRCode />);
    await waitFor(() => {
      expect(screen.getByText('Stellen Sie sicher, dass die Geräte im selben Netzwerk sind.')).toBeInTheDocument();
    });
  });

  it('shows port info at the bottom in full mode', async () => {
    render(<JuryQRCode />);
    await waitFor(() => {
      expect(screen.getByText(/Jury-Portal auf Port 3002/)).toBeInTheDocument();
    });
  });

  it('shows open in browser links for each IP', async () => {
    render(<JuryQRCode />);
    await waitFor(() => {
      const links = screen.getAllByText('Im Browser öffnen');
      expect(links).toHaveLength(2);
    });
    // Links should point to correct URLs
    const link1 = screen.getAllByText('Im Browser öffnen')[0].closest('a');
    expect(link1).toHaveAttribute('href', 'http://192.168.1.100:3002/jury');
    expect(link1).toHaveAttribute('target', '_blank');
  });

  // --- Compact Mode ---
  it('renders single QR code in compact mode', async () => {
    render(<JuryQRCode compact />);
    await waitFor(() => {
      expect(screen.getByText('QR-Code Jury-Portal')).toBeInTheDocument();
    });
    // Should show first IP's URL
    expect(screen.getByText('http://192.168.1.100:3002/jury')).toBeInTheDocument();
    // Second IP's URL should NOT be shown (only first IP selected)
    expect(screen.queryByText('http://10.0.0.5:3002/jury')).not.toBeInTheDocument();
  });

  it('shows IP selector in compact mode with multiple IPs', async () => {
    render(<JuryQRCode compact />);
    await waitFor(() => {
      expect(screen.getByText('Netzwerk auswählen')).toBeInTheDocument();
    });
    // Should have a select dropdown
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
  });

  it('hides IP selector in compact mode with single IP', async () => {
    server.use(
      http.get('/api/firewall/network-info', () => {
        return HttpResponse.json(mockNetworkInfoSingle);
      })
    );
    render(<JuryQRCode compact />);
    await waitFor(() => {
      expect(screen.getByText('QR-Code Jury-Portal')).toBeInTheDocument();
    });
    expect(screen.queryByText('Netzwerk auswählen')).not.toBeInTheDocument();
  });

  it('changes URL when selecting different IP in compact mode', async () => {
    const user = userEvent.setup();
    render(<JuryQRCode compact />);

    await waitFor(() => {
      expect(screen.getByText('http://192.168.1.100:3002/jury')).toBeInTheDocument();
    });

    // Select second IP
    const select = screen.getByRole('combobox');
    await user.selectOptions(select, '1');
    expect(screen.getByText('http://10.0.0.5:3002/jury')).toBeInTheDocument();
  });

  // --- Copy functionality ---
  it('has copy buttons for URLs', async () => {
    render(<JuryQRCode />);
    await waitFor(() => {
      const copyButtons = screen.getAllByTitle('URL kopieren');
      expect(copyButtons.length).toBeGreaterThanOrEqual(2);
    });
  });

  // --- Refresh ---
  it('has a refresh button in full mode', async () => {
    render(<JuryQRCode />);
    await waitFor(() => {
      expect(screen.getByTitle('Aktualisieren')).toBeInTheDocument();
    });
  });

  // --- URL construction ---
  it('constructs correct jury URL with custom port from API', async () => {
    server.use(
      http.get('/api/firewall/network-info', () => {
        return HttpResponse.json({
          ...mockNetworkInfoSingle,
          ports: { backend: 3001, frontend: 3001, juryPortal: 4002 },
        });
      })
    );
    render(<JuryQRCode compact />);
    await waitFor(() => {
      expect(screen.getByText('http://192.168.1.100:4002/jury')).toBeInTheDocument();
    });
  });

  it('always constructs URLs with /jury path', async () => {
    render(<JuryQRCode />);
    await waitFor(() => {
      // All URLs should end with /jury
      const url1 = screen.getByText('http://192.168.1.100:3002/jury');
      const url2 = screen.getByText('http://10.0.0.5:3002/jury');
      expect(url1).toBeInTheDocument();
      expect(url2).toBeInTheDocument();
    });
  });
});
