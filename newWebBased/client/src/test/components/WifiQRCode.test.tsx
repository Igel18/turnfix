/**
 * WifiQRCode Component Tests
 * 
 * Tests the QR code component that displays WiFi connection
 * QR codes fetched from /api/app-settings/wifi endpoint.
 * Uses MSW for API mocking.
 */

import { describe, it, expect, vi, beforeEach, afterEach, afterAll, beforeAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { WifiQRCode, generateWifiQRString } from '../../components/WifiQRCode';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, _params?: Record<string, any>) => {
      const translations: Record<string, string> = {
        'wifiQR.title': 'WLAN-Verbindung',
        'wifiQR.subtitle': 'QR-Code scannen, um sich mit dem Wettkampf-WLAN zu verbinden',
        'wifiQR.loading': 'WLAN-Einstellungen werden geladen...',
        'wifiQR.error': 'WLAN-Fehler',
        'wifiQR.errorFetching': 'WLAN-Einstellungen konnten nicht abgerufen werden',
        'wifiQR.retry': 'Erneut versuchen',
        'wifiQR.notConfigured': 'WLAN nicht konfiguriert',
        'wifiQR.notConfiguredHint': 'Konfigurieren Sie WLAN-Zugangsdaten unter Einstellungen',
        'wifiQR.selectNetwork': 'Netzwerk auswählen',
        'wifiQR.copyPassword': 'Passwort kopieren',
        'wifiQR.openNetwork': 'Offen (kein Passwort)',
        'wifiQR.networkName': 'Netzwerkname (SSID)',
        'wifiQR.encryptionType': 'Verschlüsselung',
        'wifiQR.password': 'Passwort',
        'wifiQR.scanHint': 'Kampfrichter können den QR-Code scannen',
        'wifiQR.configHint': 'WLAN-Einstellungen können unter Einstellungen geändert werden',
        'wifiQR.refresh': 'Aktualisieren',
      };
      return translations[key] || key;
    },
    i18n: { language: 'de' },
  }),
}));

const mockWifiEnabled = {
  enabled: true,
  networks: [
    { ssid: 'Turnhalle-WLAN', password: 'geheim123', encryption: 'WPA' as const, hidden: false },
    { ssid: 'Gast-Netz', password: '', encryption: 'nopass' as const, hidden: false },
  ]
};

const mockWifiSingleNetwork = {
  enabled: true,
  networks: [
    { ssid: 'Wettkampf-WLAN', password: 'turnen2024', encryption: 'WPA' as const, hidden: false },
  ]
};

const mockWifiDisabled = {
  enabled: false,
  networks: []
};

const mockWifiEnabledNoNetworks = {
  enabled: true,
  networks: []
};

// Default handler
const handlers = [
  http.get('/api/app-settings/wifi', () => {
    return HttpResponse.json(mockWifiEnabled);
  }),
];

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// ============= generateWifiQRString unit tests =============

describe('generateWifiQRString', () => {
  it('generates correct WPA QR string', () => {
    const result = generateWifiQRString({
      ssid: 'MyNetwork',
      password: 'mypass123',
      encryption: 'WPA',
    });
    expect(result).toBe('WIFI:T:WPA;S:MyNetwork;P:mypass123;;');
  });

  it('generates correct WEP QR string', () => {
    const result = generateWifiQRString({
      ssid: 'OldNetwork',
      password: 'wepkey',
      encryption: 'WEP',
    });
    expect(result).toBe('WIFI:T:WEP;S:OldNetwork;P:wepkey;;');
  });

  it('generates correct open network QR string (no password)', () => {
    const result = generateWifiQRString({
      ssid: 'FreeWifi',
      password: '',
      encryption: 'nopass',
    });
    expect(result).toBe('WIFI:T:nopass;S:FreeWifi;;');
  });

  it('adds hidden flag when network is hidden', () => {
    const result = generateWifiQRString({
      ssid: 'HiddenNet',
      password: 'secret',
      encryption: 'WPA',
      hidden: true,
    });
    expect(result).toBe('WIFI:T:WPA;S:HiddenNet;P:secret;H:true;;');
  });

  it('escapes special characters in SSID', () => {
    const result = generateWifiQRString({
      ssid: 'My;Network:Test',
      password: 'pass',
      encryption: 'WPA',
    });
    expect(result).toContain('S:My\\;Network\\:Test');
  });

  it('escapes special characters in password', () => {
    const result = generateWifiQRString({
      ssid: 'Net',
      password: 'pass;word',
      encryption: 'WPA',
    });
    expect(result).toContain('P:pass\\;word');
  });
});

// ============= WifiQRCode Component Tests =============

describe('WifiQRCode Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Loading State ---
  it('shows loading state initially', () => {
    render(<WifiQRCode />);
    expect(screen.getByText('WLAN-Einstellungen werden geladen...')).toBeInTheDocument();
  });

  // --- Error State ---
  it('shows error state on HTTP 500', async () => {
    server.use(
      http.get('/api/app-settings/wifi', () => {
        return new HttpResponse(null, { status: 500 });
      })
    );
    render(<WifiQRCode />);
    await waitFor(() => {
      expect(screen.getByText('WLAN-Fehler')).toBeInTheDocument();
    });
  });

  it('shows retry button on error', async () => {
    server.use(
      http.get('/api/app-settings/wifi', () => {
        return new HttpResponse(null, { status: 500 });
      })
    );
    render(<WifiQRCode />);
    await waitFor(() => {
      expect(screen.getByText('Erneut versuchen')).toBeInTheDocument();
    });
  });

  // --- Not Configured State ---
  it('shows not configured message when disabled', async () => {
    server.use(
      http.get('/api/app-settings/wifi', () => {
        return HttpResponse.json(mockWifiDisabled);
      })
    );
    render(<WifiQRCode />);
    await waitFor(() => {
      expect(screen.getByText('WLAN nicht konfiguriert')).toBeInTheDocument();
    });
  });

  it('shows not configured when enabled but no networks', async () => {
    server.use(
      http.get('/api/app-settings/wifi', () => {
        return HttpResponse.json(mockWifiEnabledNoNetworks);
      })
    );
    render(<WifiQRCode />);
    await waitFor(() => {
      expect(screen.getByText('WLAN nicht konfiguriert')).toBeInTheDocument();
    });
  });

  // --- Full Mode ---
  describe('Full Mode', () => {
    it('renders QR code for each network', async () => {
      render(<WifiQRCode />);
      await waitFor(() => {
        expect(screen.getAllByText('Turnhalle-WLAN').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('Gast-Netz').length).toBeGreaterThanOrEqual(1);
      });
      // Should have SVG QR codes rendered
      const svgs = document.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThanOrEqual(2);
    });

    it('shows numbered labels on networks', async () => {
      render(<WifiQRCode />);
      await waitFor(() => {
        expect(screen.getByText('1')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument();
      });
    });

    it('shows network details (SSID, encryption)', async () => {
      render(<WifiQRCode />);
      await waitFor(() => {
        const ssidLabels = screen.getAllByText('Netzwerkname (SSID)');
        expect(ssidLabels.length).toBeGreaterThanOrEqual(1);
        const encLabels = screen.getAllByText('Verschlüsselung');
        expect(encLabels.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('shows password for encrypted networks', async () => {
      render(<WifiQRCode />);
      await waitFor(() => {
        expect(screen.getByText('geheim123')).toBeInTheDocument();
      });
    });

    it('shows title and subtitle', async () => {
      render(<WifiQRCode />);
      await waitFor(() => {
        expect(screen.getByText('WLAN-Verbindung')).toBeInTheDocument();
        expect(screen.getByText('QR-Code scannen, um sich mit dem Wettkampf-WLAN zu verbinden')).toBeInTheDocument();
      });
    });

    it('shows scan hint', async () => {
      render(<WifiQRCode />);
      await waitFor(() => {
        expect(screen.getByText('Kampfrichter können den QR-Code scannen')).toBeInTheDocument();
      });
    });

    it('has refresh button', async () => {
      render(<WifiQRCode />);
      await waitFor(() => {
        expect(screen.getByTitle('Aktualisieren')).toBeInTheDocument();
      });
    });

    it('copy password buttons work', async () => {
      const user = userEvent.setup();
      // Mock clipboard using vi.spyOn
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal('navigator', {
        ...navigator,
        clipboard: { writeText: writeTextMock },
      });

      render(<WifiQRCode />);
      await waitFor(() => {
        expect(screen.getByText('geheim123')).toBeInTheDocument();
      });

      const copyButtons = screen.getAllByTitle('Passwort kopieren');
      expect(copyButtons.length).toBeGreaterThanOrEqual(1);
      await user.click(copyButtons[0]);
      expect(writeTextMock).toHaveBeenCalledWith('geheim123');

      vi.unstubAllGlobals();
    });
  });

  // --- Compact Mode ---
  describe('Compact Mode', () => {
    it('renders in compact mode with single QR', async () => {
      render(<WifiQRCode compact />);
      await waitFor(() => {
        expect(screen.getByText('WLAN-Verbindung')).toBeInTheDocument();
        // First network SSID should be visible
        expect(screen.getAllByText('Turnhalle-WLAN').length).toBeGreaterThanOrEqual(1);
      });
    });

    it('shows network selector dropdown when multiple networks', async () => {
      render(<WifiQRCode compact />);
      await waitFor(() => {
        expect(screen.getByText('Netzwerk auswählen')).toBeInTheDocument();
      });
      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
    });

    it('does not show selector with single network', async () => {
      server.use(
        http.get('/api/app-settings/wifi', () => {
          return HttpResponse.json(mockWifiSingleNetwork);
        })
      );
      render(<WifiQRCode compact />);
      await waitFor(() => {
        expect(screen.getByText('Wettkampf-WLAN')).toBeInTheDocument();
      });
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    });

    it('switches network on selection change', async () => {
      const user = userEvent.setup();
      render(<WifiQRCode compact />);
      await waitFor(() => {
        expect(screen.getAllByText('Turnhalle-WLAN').length).toBeGreaterThanOrEqual(1);
      });

      const select = screen.getByRole('combobox');
      await user.selectOptions(select, '1');

      await waitFor(() => {
        expect(screen.getAllByText('Gast-Netz').length).toBeGreaterThanOrEqual(1);
      });
    });

    it('shows copy password button for encrypted network', async () => {
      render(<WifiQRCode compact />);
      await waitFor(() => {
        expect(screen.getByTitle('Passwort kopieren')).toBeInTheDocument();
      });
    });
  });
});
