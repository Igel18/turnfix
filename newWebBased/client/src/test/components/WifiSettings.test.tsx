/**
 * WifiSettings Component Tests
 * 
 * Tests the WiFi configuration component used in the
 * Configuration page to manage WLAN networks for QR codes.
 * Uses MSW for API mocking.
 */

import { describe, it, expect, vi, beforeEach, afterEach, afterAll, beforeAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import WifiSettings from '../../components/WifiSettings';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, _params?: Record<string, any>) => {
      const translations: Record<string, string> = {
        'wifiSettings.loading': 'WLAN-Einstellungen werden geladen...',
        'wifiSettings.infoTitle': 'WLAN-QR-Code für Kampfrichter',
        'wifiSettings.infoText': 'Hinterlegen Sie hier die WLAN-Zugangsdaten.',
        'wifiSettings.enableLabel': 'WLAN-QR-Code aktivieren',
        'wifiSettings.enableDescription': 'QR-Code auf der Startseite anzeigen',
        'wifiSettings.networksTitle': 'WLAN-Netzwerke',
        'wifiSettings.addNetwork': 'Netzwerk hinzufügen',
        'wifiSettings.noNetworks': 'Keine WLAN-Netzwerke konfiguriert',
        'wifiSettings.addFirstNetwork': 'Erstes Netzwerk hinzufügen',
        'wifiSettings.newNetwork': 'Neues Netzwerk',
        'wifiSettings.ssidLabel': 'Netzwerkname (SSID)',
        'wifiSettings.ssidPlaceholder': 'z.B. Turnhalle-WLAN',
        'wifiSettings.encryptionLabel': 'Verschlüsselung',
        'wifiSettings.encryptionNone': 'Offen (kein Passwort)',
        'wifiSettings.passwordLabel': 'Passwort',
        'wifiSettings.passwordPlaceholder': 'WLAN-Passwort eingeben',
        'wifiSettings.hiddenNetwork': 'Verstecktes Netzwerk',
        'wifiSettings.moveUp': 'Nach oben',
        'wifiSettings.moveDown': 'Nach unten',
        'wifiSettings.preview': 'QR-Vorschau',
        'wifiSettings.previewLabel': 'QR-Code Vorschau',
        'wifiSettings.removeNetwork': 'Netzwerk entfernen',
        'wifiSettings.save': 'WLAN-Einstellungen speichern',
        'wifiSettings.saving': 'Wird gespeichert...',
        'wifiSettings.saveSuccess': 'WLAN-Einstellungen erfolgreich gespeichert',
        'wifiSettings.saveFailed': 'Fehler beim Speichern',
        'wifiSettings.errorEmptySSID': 'Alle Netzwerke müssen einen Namen haben',
        'wifiSettings.errorEmptyPassword': 'Verschlüsselte Netzwerke müssen ein Passwort haben',
      };
      return translations[key] || key;
    },
    i18n: { language: 'de' },
  }),
}));

const mockWifiSettings = {
  enabled: true,
  networks: [
    { ssid: 'Turnhalle-WLAN', password: 'geheim123', encryption: 'WPA', hidden: false },
  ]
};

const mockWifiEmpty = {
  enabled: false,
  networks: []
};

// Default handler
const handlers = [
  http.get('/api/app-settings/wifi', () => {
    return HttpResponse.json(mockWifiEmpty);
  }),
  http.put('/api/app-settings/wifi', () => {
    return HttpResponse.json({ success: true });
  }),
];

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('WifiSettings Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Loading State ---
  it('shows loading state initially', () => {
    render(<WifiSettings />);
    expect(screen.getByText('WLAN-Einstellungen werden geladen...')).toBeInTheDocument();
  });

  // --- Initial State (disabled) ---
  it('shows enable toggle and info box', async () => {
    render(<WifiSettings />);
    await waitFor(() => {
      expect(screen.getByText('WLAN-QR-Code aktivieren')).toBeInTheDocument();
      expect(screen.getByText('WLAN-QR-Code für Kampfrichter')).toBeInTheDocument();
    });
  });

  it('does not show networks section when disabled', async () => {
    render(<WifiSettings />);
    await waitFor(() => {
      expect(screen.getByText('WLAN-QR-Code aktivieren')).toBeInTheDocument();
    });
    expect(screen.queryByText('WLAN-Netzwerke')).not.toBeInTheDocument();
  });

  // --- Enabling WiFi ---
  it('shows networks section after enabling', async () => {
    const user = userEvent.setup();
    render(<WifiSettings />);
    await waitFor(() => {
      expect(screen.getByText('WLAN-QR-Code aktivieren')).toBeInTheDocument();
    });

    // Toggle enable
    const toggle = screen.getByRole('checkbox');
    await user.click(toggle);

    await waitFor(() => {
      expect(screen.getByText(/WLAN-Netzwerke \(0\)/)).toBeInTheDocument();
      expect(screen.getByText('Keine WLAN-Netzwerke konfiguriert')).toBeInTheDocument();
    });
  });

  // --- Adding Networks ---
  it('can add a new network', async () => {
    const user = userEvent.setup();
    render(<WifiSettings />);
    await waitFor(() => {
      expect(screen.getByText('WLAN-QR-Code aktivieren')).toBeInTheDocument();
    });

    // Enable first
    const toggle = screen.getByRole('checkbox');
    await user.click(toggle);

    // Click "Add Network"
    await waitFor(() => {
      expect(screen.getByText('Netzwerk hinzufügen')).toBeInTheDocument();
    });
    await user.click(screen.getByText('Netzwerk hinzufügen'));

    // Should show network form with SSID, Encryption, Password fields
    await waitFor(() => {
      expect(screen.getByText('Netzwerkname (SSID)')).toBeInTheDocument();
      expect(screen.getByText('Verschlüsselung')).toBeInTheDocument();
      expect(screen.getByText('Passwort')).toBeInTheDocument();
    });
  });

  // --- Loading Existing Settings ---
  it('loads existing networks from API', async () => {
    server.use(
      http.get('/api/app-settings/wifi', () => {
        return HttpResponse.json(mockWifiSettings);
      })
    );

    render(<WifiSettings />);
    await waitFor(() => {
      expect(screen.getByDisplayValue('Turnhalle-WLAN')).toBeInTheDocument();
      expect(screen.getByDisplayValue('geheim123')).toBeInTheDocument();
    });
  });

  // --- Removing Networks ---
  it('can remove a network', async () => {
    const user = userEvent.setup();
    server.use(
      http.get('/api/app-settings/wifi', () => {
        return HttpResponse.json(mockWifiSettings);
      })
    );

    render(<WifiSettings />);
    await waitFor(() => {
      expect(screen.getByDisplayValue('Turnhalle-WLAN')).toBeInTheDocument();
    });

    // Click remove button
    const removeBtn = screen.getByTitle('Netzwerk entfernen');
    await user.click(removeBtn);

    // Network should be gone
    expect(screen.queryByDisplayValue('Turnhalle-WLAN')).not.toBeInTheDocument();
  });

  // --- QR Preview ---
  it('shows QR preview when preview button clicked', async () => {
    const user = userEvent.setup();
    server.use(
      http.get('/api/app-settings/wifi', () => {
        return HttpResponse.json(mockWifiSettings);
      })
    );

    render(<WifiSettings />);
    await waitFor(() => {
      expect(screen.getByDisplayValue('Turnhalle-WLAN')).toBeInTheDocument();
    });

    const previewBtn = screen.getByTitle('QR-Vorschau');
    await user.click(previewBtn);

    await waitFor(() => {
      expect(screen.getByText('QR-Code Vorschau')).toBeInTheDocument();
      // Should have QR string displayed
      expect(screen.getByText(/WIFI:T:WPA;S:Turnhalle-WLAN/)).toBeInTheDocument();
    });
  });

  // --- Saving ---
  it('can save settings', async () => {
    const user = userEvent.setup();
    let savedData: any = null;
    server.use(
      http.get('/api/app-settings/wifi', () => {
        return HttpResponse.json(mockWifiSettings);
      }),
      http.put('/api/app-settings/wifi', async ({ request }) => {
        savedData = await request.json();
        return HttpResponse.json({ success: true });
      })
    );

    render(<WifiSettings />);
    await waitFor(() => {
      expect(screen.getByDisplayValue('Turnhalle-WLAN')).toBeInTheDocument();
    });

    // Click save
    await user.click(screen.getByText('WLAN-Einstellungen speichern'));

    await waitFor(() => {
      expect(screen.getByText('WLAN-Einstellungen erfolgreich gespeichert')).toBeInTheDocument();
    });

    expect(savedData).toBeTruthy();
    expect(savedData.enabled).toBe(true);
    expect(savedData.networks).toHaveLength(1);
    expect(savedData.networks[0].ssid).toBe('Turnhalle-WLAN');
  });

  // --- Validation ---
  it('shows error when saving with empty SSID', async () => {
    const user = userEvent.setup();
    render(<WifiSettings />);
    await waitFor(() => {
      expect(screen.getByText('WLAN-QR-Code aktivieren')).toBeInTheDocument();
    });

    // Enable and add empty network
    await user.click(screen.getByRole('checkbox'));
    await waitFor(() => {
      expect(screen.getByText('Netzwerk hinzufügen')).toBeInTheDocument();
    });
    await user.click(screen.getByText('Netzwerk hinzufügen'));

    // Try to save (SSID is empty)
    await user.click(screen.getByText('WLAN-Einstellungen speichern'));

    await waitFor(() => {
      expect(screen.getByText('Alle Netzwerke müssen einen Namen haben')).toBeInTheDocument();
    });
  });

  it('shows error when saving encrypted network without password', async () => {
    const user = userEvent.setup();
    render(<WifiSettings />);
    await waitFor(() => {
      expect(screen.getByText('WLAN-QR-Code aktivieren')).toBeInTheDocument();
    });

    // Enable and add network with SSID but no password
    await user.click(screen.getByRole('checkbox'));
    await waitFor(() => {
      expect(screen.getByText('Netzwerk hinzufügen')).toBeInTheDocument();
    });
    await user.click(screen.getByText('Netzwerk hinzufügen'));

    // Type SSID
    const ssidInput = screen.getByPlaceholderText('z.B. Turnhalle-WLAN');
    await user.type(ssidInput, 'TestNetwork');

    // Try to save (password is empty, encryption is WPA)
    await user.click(screen.getByText('WLAN-Einstellungen speichern'));

    await waitFor(() => {
      expect(screen.getByText('Verschlüsselte Netzwerke müssen ein Passwort haben')).toBeInTheDocument();
    });
  });

  // --- Hidden Network Checkbox ---
  it('has hidden network checkbox', async () => {
    const user = userEvent.setup();
    server.use(
      http.get('/api/app-settings/wifi', () => {
        return HttpResponse.json(mockWifiSettings);
      })
    );

    render(<WifiSettings />);
    await waitFor(() => {
      expect(screen.getByText('Verstecktes Netzwerk')).toBeInTheDocument();
    });
  });

  // --- Save button ---
  it('shows save button', async () => {
    render(<WifiSettings />);
    await waitFor(() => {
      expect(screen.getByText('WLAN-Einstellungen speichern')).toBeInTheDocument();
    });
  });

  // --- Numbered network headers ---
  it('shows numbered network headers', async () => {
    server.use(
      http.get('/api/app-settings/wifi', () => {
        return HttpResponse.json({
          enabled: true,
          networks: [
            { ssid: 'Net-1', password: 'pass1', encryption: 'WPA', hidden: false },
            { ssid: 'Net-2', password: 'pass2', encryption: 'WPA', hidden: false },
          ]
        });
      })
    );

    render(<WifiSettings />);
    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('Net-1')).toBeInTheDocument();
      expect(screen.getByText('Net-2')).toBeInTheDocument();
    });
  });
});
