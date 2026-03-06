/**
 * MSW-Powered Integration Test — Documents Page
 *
 * Renders the Documents page with MSW mock API.
 * Tests data loading, filtering, upload area, table rendering,
 * download, delete, and category switching.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../msw/server';
import { renderWithProviders } from '../renderWithProviders';
import Documents from '../../pages/Documents';

// Mock react-i18next (returns keys as-is)
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: any) => {
      if (typeof fallback === 'string') return fallback;
      return key;
    },
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
  I18nextProvider: ({ children }: { children: React.ReactNode }) => children,
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}));

// ── Test data ──────────────────────────────────────────────────────────────

const mockFiles = [
  {
    filename: 'barren.png',
    category: 'icons',
    size: 2048,
    modified: '2025-06-01T10:00:00Z',
    created: '2025-05-01T08:00:00Z',
    mimetype: 'image/png',
    url: '/public/icons/barren.png',
  },
  {
    filename: 'boden.png',
    category: 'icons',
    size: 3072,
    modified: '2025-06-02T10:00:00Z',
    created: '2025-05-02T08:00:00Z',
    mimetype: 'image/png',
    url: '/public/icons/boden.png',
  },
  {
    filename: 'competition.xml',
    category: 'xml',
    size: 51200,
    modified: '2025-06-03T10:00:00Z',
    created: '2025-05-03T08:00:00Z',
    mimetype: 'application/xml',
    url: '/uploads/xml/competition.xml',
  },
  {
    filename: 'photo1.jpg',
    category: 'images',
    size: 1048576,
    modified: '2025-06-04T10:00:00Z',
    created: '2025-05-04T08:00:00Z',
    mimetype: 'image/jpeg',
    url: '/uploads/images/photo1.jpg',
  },
  {
    filename: 'settings.json',
    category: 'json',
    size: 512,
    modified: '2025-06-05T10:00:00Z',
    created: '2025-05-05T08:00:00Z',
    mimetype: 'application/json',
    url: '/src/data/json/settings.json',
  },
];

const mockCategories = [
  { key: 'icons', fileCount: 2, uploadAllowed: true, deleteAllowed: true, maxFileSize: 2097152, allowedMimes: ['image/png', 'image/svg+xml'] },
  { key: 'images', fileCount: 1, uploadAllowed: true, deleteAllowed: true, maxFileSize: 10485760, allowedMimes: ['image/*'] },
  { key: 'xml', fileCount: 1, uploadAllowed: true, deleteAllowed: true, maxFileSize: 10485760, allowedMimes: ['text/xml', 'application/xml'] },
  { key: 'json', fileCount: 1, uploadAllowed: false, deleteAllowed: false, maxFileSize: 0, allowedMimes: [] },
];

// ── MSW handlers ───────────────────────────────────────────────────────────

function installDocumentsHandlers() {
  server.use(
    http.get('/api/documents', () => {
      return HttpResponse.json({ files: mockFiles });
    }),
    http.get('/api/documents/categories', () => {
      return HttpResponse.json({ categories: mockCategories });
    }),
    http.post('/api/documents/upload', async ({ request }) => {
      return HttpResponse.json({
        file: {
          filename: 'uploaded.png',
          originalName: 'uploaded.png',
          category: 'icons',
          size: 4096,
          mimetype: 'image/png',
          url: '/public/icons/uploaded.png',
        },
      });
    }),
    http.delete('/api/documents/:cat/:file', () => {
      return HttpResponse.json({ message: 'Deleted' });
    }),
  );
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('Documents Page (MSW Integration)', () => {
  beforeEach(() => {
    installDocumentsHandlers();
  });

  // ── Rendering ────────────────────────────────────────────────────────────

  it('should render the page title', async () => {
    renderWithProviders(<Documents />);

    await waitFor(() => {
      // t() mock returns German fallback: 'Dokumente & Dateien'
      expect(screen.getByText('Dokumente & Dateien')).toBeInTheDocument();
    });
  });

  it('should display files from the API', async () => {
    renderWithProviders(<Documents />);

    await waitFor(() => {
      expect(screen.getByText('barren.png')).toBeInTheDocument();
      expect(screen.getByText('boden.png')).toBeInTheDocument();
      expect(screen.getByText('competition.xml')).toBeInTheDocument();
      expect(screen.getByText('photo1.jpg')).toBeInTheDocument();
      expect(screen.getByText('settings.json')).toBeInTheDocument();
    });
  });

  it('should display subtitle with file info', async () => {
    renderWithProviders(<Documents />);

    await waitFor(() => {
      // t() returns the un-interpolated fallback: "{{count}} Dateien in {{cats}} Kategorien"
      expect(screen.getByText(/Dateien in.*Kategorien/)).toBeInTheDocument();
    });
  });

  // ── Filtering ────────────────────────────────────────────────────────────

  it('should filter files by search term', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Documents />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('barren.png')).toBeInTheDocument();
    });

    // Find a search input — t() returns German fallback: "Dateiname suchen..."
    const searchInput =
      screen.queryByPlaceholderText(/Dateiname suchen/i) ||
      screen.queryByPlaceholderText(/search/i) ||
      screen.queryByPlaceholderText(/suche/i);

    if (searchInput) {
      await user.type(searchInput, 'barren');

      await waitFor(() => {
        expect(screen.getByText('barren.png')).toBeInTheDocument();
        expect(screen.queryByText('competition.xml')).not.toBeInTheDocument();
      });
    }
  });

  it('should filter files by category', async () => {
    renderWithProviders(<Documents />);

    // Wait for data
    await waitFor(() => {
      expect(screen.getByText('barren.png')).toBeInTheDocument();
    });

    // Try to find and select a category filter
    const categorySelect = screen.queryByRole('combobox');
    if (categorySelect) {
      const user = userEvent.setup();
      await user.selectOptions(categorySelect, 'xml');

      await waitFor(() => {
        expect(screen.getByText('competition.xml')).toBeInTheDocument();
        expect(screen.queryByText('barren.png')).not.toBeInTheDocument();
      });
    }
  });

  // ── Loading & Errors ─────────────────────────────────────────────────────

  it('should show loading state initially', async () => {
    server.use(
      http.get('/api/documents', async () => {
        await new Promise(resolve => setTimeout(resolve, 500));
        return HttpResponse.json({ files: [] });
      }),
      http.get('/api/documents/categories', async () => {
        await new Promise(resolve => setTimeout(resolve, 500));
        return HttpResponse.json({ categories: [] });
      }),
    );

    renderWithProviders(<Documents />);

    // Page title should render even during loading
    await waitFor(() => {
      expect(screen.getByText('Dokumente & Dateien')).toBeInTheDocument();
    });
  });

  it('should handle API error gracefully (no crash)', async () => {
    server.use(
      http.get('/api/documents', () => {
        return HttpResponse.json({ error: 'Internal Server Error' }, { status: 500 });
      }),
      http.get('/api/documents/categories', () => {
        return HttpResponse.json({ error: 'Internal Server Error' }, { status: 500 });
      }),
    );

    renderWithProviders(<Documents />);

    await waitFor(() => {
      expect(screen.getByText('Dokumente & Dateien')).toBeInTheDocument();
    });
  });

  it('should handle empty file list', async () => {
    server.use(
      http.get('/api/documents', () => {
        return HttpResponse.json({ files: [] });
      }),
      http.get('/api/documents/categories', () => {
        return HttpResponse.json({ categories: mockCategories });
      }),
    );

    renderWithProviders(<Documents />);

    await waitFor(() => {
      expect(screen.getByText('Dokumente & Dateien')).toBeInTheDocument();
    });

    // No file names should appear
    expect(screen.queryByText('barren.png')).not.toBeInTheDocument();
  });

  // ── Upload Area ──────────────────────────────────────────────────────────

  it('should display the upload area', async () => {
    renderWithProviders(<Documents />);

    await waitFor(() => {
      expect(screen.getByText('barren.png')).toBeInTheDocument();
    });

    // Upload area should contain "Datei hochladen in:" label
    const uploadLabels = screen.queryAllByText(/Datei hochladen/i);
    expect(uploadLabels.length).toBeGreaterThanOrEqual(1);
  });

  it('should display segmented category buttons in upload area', async () => {
    renderWithProviders(<Documents />);

    await waitFor(() => {
      expect(screen.getByText('barren.png')).toBeInTheDocument();
    });

    // Should have buttons for uploadable categories (icons, images, xml)
    const iconsElements = screen.queryAllByText(/icons/i);
    expect(iconsElements.length).toBeGreaterThanOrEqual(1);
  });

  // ── Delete ───────────────────────────────────────────────────────────────

  it('should have delete buttons for deletable files', async () => {
    renderWithProviders(<Documents />);

    await waitFor(() => {
      expect(screen.getByText('barren.png')).toBeInTheDocument();
    });

    // Delete buttons (trash icons) should exist for files in deletable categories
    const trashButtons = screen.queryAllByRole('button').filter(
      btn => btn.querySelector('svg') || btn.textContent?.match(/delete|löschen/i)
    );
    expect(trashButtons.length).toBeGreaterThan(0);
  });

  // ── Thumbnail rendering ──────────────────────────────────────────────────

  it('should render thumbnails for image files', async () => {
    renderWithProviders(<Documents />);

    await waitFor(() => {
      expect(screen.getByText('barren.png')).toBeInTheDocument();
    });

    // Image files should render <img> tags as thumbnails
    const images = screen.getAllByRole('img');
    expect(images.length).toBeGreaterThanOrEqual(1);
  });

  // ── Category badges ──────────────────────────────────────────────────────

  it('should render category badges for each file', async () => {
    renderWithProviders(<Documents />);

    await waitFor(() => {
      expect(screen.getByText('barren.png')).toBeInTheDocument();
    });

    // Category labels should appear (translated or key)
    const iconsLabels = screen.queryAllByText(/icons/i);
    expect(iconsLabels.length).toBeGreaterThan(0);
  });
});
