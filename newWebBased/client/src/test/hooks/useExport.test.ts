import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useExport } from '@/pages/Results/hooks/useExport';

vi.mock('@/contexts/EventContext', () => ({
  useEvent: () => ({ selectedEvent: null })
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key })
}));

describe('useExport GymNet XML', () => {
  const originalFetch = global.fetch;
  const originalCreateElement = document.createElement.bind(document);
  const originalCreateObjectURL = window.URL.createObjectURL;
  const originalRevokeObjectURL = window.URL.revokeObjectURL;

  beforeEach(() => {
    vi.restoreAllMocks();

    if (typeof window.URL.createObjectURL !== 'function') {
      Object.defineProperty(window.URL, 'createObjectURL', {
        writable: true,
        value: vi.fn()
      });
    }

    if (typeof window.URL.revokeObjectURL !== 'function') {
      Object.defineProperty(window.URL, 'revokeObjectURL', {
        writable: true,
        value: vi.fn()
      });
    }
  });

  afterEach(() => {
    global.fetch = originalFetch;

    if (originalCreateObjectURL) {
      Object.defineProperty(window.URL, 'createObjectURL', {
        writable: true,
        value: originalCreateObjectURL
      });
    } else {
      // keep a harmless no-op for jsdom environments without this API
      Object.defineProperty(window.URL, 'createObjectURL', {
        writable: true,
        value: vi.fn()
      });
    }

    if (originalRevokeObjectURL) {
      Object.defineProperty(window.URL, 'revokeObjectURL', {
        writable: true,
        value: originalRevokeObjectURL
      });
    } else {
      Object.defineProperty(window.URL, 'revokeObjectURL', {
        writable: true,
        value: vi.fn()
      });
    }
  });

  it('requests GymNet XML endpoint and downloads returned file', async () => {
    const clickSpy = vi.fn();
    const createObjectURLSpy = vi.spyOn(window.URL, 'createObjectURL').mockReturnValue('blob:test');
    const revokeObjectURLSpy = vi.spyOn(window.URL, 'revokeObjectURL').mockImplementation(() => {});

    vi.spyOn(document, 'createElement').mockImplementation((tagName: string): any => {
      if (tagName.toLowerCase() === 'a') {
        return {
          href: '',
          download: '',
          click: clickSpy
        } as HTMLAnchorElement;
      }
      return originalCreateElement(tagName);
    });

    const blob = new Blob(['<xml></xml>'], { type: 'application/xml' });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(blob),
      headers: {
        get: (name: string) => {
          if (name.toLowerCase() === 'content-disposition') {
            return 'attachment; filename="gymnet_export.xml"';
          }
          return null;
        }
      }
    } as unknown as Response);

    const { result } = renderHook(() =>
      useExport({
        eventId: '42',
        eventName: 'Test Event',
        selectedCompetition: '9',
        ranking: [],
        competitionGroups: [],
        disciplines: [],
        disciplineFormulas: {},
        selectedCompetitionDisciplineInfo: [],
        formatScore: (score: number) => score.toFixed(3)
      })
    );

    await result.current.exportResultsGymNetXML();

    expect(global.fetch).toHaveBeenCalledWith('/api/results/export-gymnet-xml?eventId=42&competitionId=9');
    expect(createObjectURLSpy).toHaveBeenCalledWith(blob);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:test');
  });
});
