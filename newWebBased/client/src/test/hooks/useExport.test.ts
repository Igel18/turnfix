import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const {
  addSectionTitleMock,
  addPDFHeaderFooterMock,
  autoTableMock,
  jsPdfSaveMock
} = vi.hoisted(() => ({
  addSectionTitleMock: vi.fn(),
  addPDFHeaderFooterMock: vi.fn(),
  autoTableMock: vi.fn(),
  jsPdfSaveMock: vi.fn()
}));

const createMockDoc = () => ({
  internal: {
    pageSize: {
      width: 297,
      height: 210,
      getWidth: () => 297,
      getHeight: () => 210,
    },
    getCurrentPageInfo: () => ({ pageNumber: 1 }),
    getNumberOfPages: () => 1,
  },
  setFontSize: vi.fn(),
  setFont: vi.fn(),
  setTextColor: vi.fn(),
  setFillColor: vi.fn(),
  setDrawColor: vi.fn(),
  text: vi.fn(),
  line: vi.fn(),
  rect: vi.fn(),
  save: jsPdfSaveMock,
  setPage: vi.fn(),
});

let currentDoc = createMockDoc();

vi.mock('jspdf', () => ({
  default: vi.fn().mockImplementation(() => currentDoc),
}));

vi.mock('jspdf-autotable', () => ({
  default: autoTableMock
}));

vi.mock('@/utils/pdfUtils', () => ({
  addPDFHeaderFooter: addPDFHeaderFooterMock,
  getUnifiedTableStyles: vi.fn(() => ({})),
  addSectionTitle: addSectionTitleMock,
  drawRankingBadge: vi.fn()
}));

vi.mock('@/utils/pdfStyles', () => ({
  pdfColors: {
    background: { header: [240, 248, 255] },
    ranking: { gold: [255, 215, 0], silver: [192, 192, 192], bronze: [205, 127, 50] },
    text: { primary: [0, 0, 0] }
  },
  applyTableHeaderStyle: vi.fn(),
  applyFormulaStyle: vi.fn()
}));

vi.mock('@/utils/pdfIcons', () => ({
  preloadIconsForPDF: vi.fn(async () => new Map()),
  addIconToPDF: vi.fn()
}));

vi.mock('@/utils/headerLabels', () => ({
  getUnifiedResultsHeaderLabels: vi.fn(() => ({
    rank: 'Platz',
    startNumber: 'Start-Nr.',
    name: 'Name',
    club: 'Verein',
    age: 'Alter',
    total: 'Gesamt'
  }))
}));

vi.mock('@/utils/disciplineIcons', () => ({
  getDisciplineShortName: vi.fn((discipline: string) => discipline)
}));

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
    addSectionTitleMock.mockClear();
    addPDFHeaderFooterMock.mockClear();
    autoTableMock.mockClear();
    jsPdfSaveMock.mockClear();
    currentDoc = createMockDoc();

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
    const { useExport } = await import('../../pages/Results/hooks/useExport');

    const clickSpy = vi.fn();
    const createObjectURLSpy = vi.spyOn(window.URL, 'createObjectURL').mockReturnValue('blob:test');
    const revokeObjectURLSpy = vi.spyOn(window.URL, 'revokeObjectURL').mockImplementation(() => {});

    vi.spyOn(document, 'createElement').mockImplementation((tagName: string): any => {
      if (tagName.toLowerCase() === 'a') {
        return {
          href: '',
          download: '',
          click: clickSpy
        } as unknown as HTMLAnchorElement;
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

  it('posts template file to template export endpoint and downloads returned file', async () => {
    const { useExport } = await import('../../pages/Results/hooks/useExport');

    const clickSpy = vi.fn();
    const createObjectURLSpy = vi.spyOn(window.URL, 'createObjectURL').mockReturnValue('blob:template');
    const revokeObjectURLSpy = vi.spyOn(window.URL, 'revokeObjectURL').mockImplementation(() => {});

    vi.spyOn(document, 'createElement').mockImplementation((tagName: string): any => {
      if (tagName.toLowerCase() === 'a') {
        return {
          href: '',
          download: '',
          click: clickSpy
        } as unknown as HTMLAnchorElement;
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
            return 'attachment; filename="gymnet_template_results.xml"';
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

    const templateFile = new File(['<Wettkämpfe/>'], 'import.xml', { type: 'application/xml' });
    await result.current.exportResultsGymNetXML(templateFile);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = (global.fetch as any).mock.calls[0];
    expect(url).toBe('/api/results/export-gymnet-xml-template');
    expect(options.method).toBe('POST');
    expect(options.body).toBeInstanceOf(FormData);

    expect(createObjectURLSpy).toHaveBeenCalledWith(blob);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:template');
  });

  it('uses ranking competition name for filtered PDF export when single-competition groups are empty', async () => {
    const { resolveCompetitionExportName } = await import('../../pages/Results/hooks/useExport');

    const competitionName = resolveCompetitionExportName(
      '9',
      [
        {
          id: 1,
          name: 'Sophie Beispielkind',
          club: 'SV Beispiel',
          startNumber: 1,
          age: 10,
          gender: 'weiblich',
          startet_nicht: false,
          scores: {},
          juryResults: {},
          formulas: {},
          totalScore: 37.5,
          rank: 1,
          competitionId: 9,
          competitionName: 'AK 10 weiblich (Nr. 7)'
        }
      ],
      []
    );

    expect(competitionName).toBe('AK 10 weiblich (Nr. 7)');
  });
});
