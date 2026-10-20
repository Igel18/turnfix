import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolveEventForPDFHeader } from '@/utils/pdfEventResolver';

describe('pdfEventResolver', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('prefers fresh API location over cached selected event location', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        int_eventid: 59,
        var_eventname: 'Landesfinale',
        dat_eventstartdate: '2025-05-10',
        dat_eventenddate: '2025-05-11',
        var_location: 'Richtige Halle',
        status: 'active'
      })
    } as unknown as Response);

    const resolved = await resolveEventForPDFHeader({
      int_eventid: 59,
      var_eventname: 'Landesfinale',
      dat_eventstartdate: '2025-05-10',
      dat_eventenddate: '2025-05-11',
      var_location: 'Muster-Sporthalle',
      status: 'active'
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/events/59');
    expect(resolved?.var_location).toBe('Richtige Halle');
  });

  it('falls back to selected event location when API is unavailable', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network failure'));

    const resolved = await resolveEventForPDFHeader({
      int_eventid: 59,
      var_eventname: 'Landesfinale',
      dat_eventstartdate: '2025-05-10',
      dat_eventenddate: '2025-05-11',
      var_location: 'Lokale Halle',
      status: 'active'
    });

    expect(resolved?.var_location).toBe('Lokale Halle');
  });

  it('uses fallback values when selected event is missing', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false
    } as unknown as Response);

    const resolved = await resolveEventForPDFHeader(null, {
      int_eventid: 77,
      var_eventname: 'Fallback Event',
      var_location: 'Fallback Halle'
    });

    expect(resolved).toEqual(expect.objectContaining({
      int_eventid: 77,
      var_eventname: 'Fallback Event',
      var_location: 'Fallback Halle'
    }));
  });
});
