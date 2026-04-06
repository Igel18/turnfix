/**
 * Unit Tests — Point 128: update-details endpoint with statusId, bol_ak, var_comment
 * ─────────────────────────────────────────────────────────────────────────────
 * Before Point 128 the update-details route only persisted:
 *   - var_riege (squad_name)
 *   - bol_startet_nicht (startet_nicht)
 *
 * After the fix it also persists:
 *   - bol_ak
 *   - var_comment
 *   - int_statusid (statusId) — new field for Point 128
 *
 * Tests here verify the update-data-assembly logic in isolation via pure
 * helper functions that mirror what the route does.
 */

// ─── Helper: mirrors the route's wertungen update-data assembly ───────────────

interface WertungenUpdateInput {
  squad_name?: string;
  startet_nicht?: boolean;
  bol_ak?: boolean;
  var_comment?: string;
  statusId?: number;
}

/**
 * Mirrors the logic from eventParticipantAssignments.ts that assembles the
 * `data` object passed to `prisma.tfx_wertungen.updateMany`.
 */
function buildWertungenUpdateData(input: WertungenUpdateInput): Record<string, unknown> {
  const data: Record<string, unknown> = {};

  if (input.squad_name !== undefined)    data.var_riege         = input.squad_name;
  if (input.startet_nicht !== undefined) data.bol_startet_nicht = input.startet_nicht;
  if (input.bol_ak !== undefined)        data.bol_ak            = input.bol_ak;
  if (input.var_comment !== undefined)   data.var_comment       = input.var_comment;
  if (input.statusId !== undefined && Number.isInteger(input.statusId) && input.statusId > 0) {
    data.int_statusid = input.statusId;
  }

  return data;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('update-details: wertungen update-data assembly', () => {

  // ── squad_name / startet_nicht (pre-existing behaviour) ──────────────────

  it('includes var_riege when squad_name is provided', () => {
    const data = buildWertungenUpdateData({ squad_name: 'wBlau' });
    expect(data.var_riege).toBe('wBlau');
  });

  it('includes bol_startet_nicht when startet_nicht is provided', () => {
    const data = buildWertungenUpdateData({ startet_nicht: true });
    expect(data.bol_startet_nicht).toBe(true);
  });

  it('includes bol_startet_nicht = false', () => {
    const data = buildWertungenUpdateData({ startet_nicht: false });
    expect(data.bol_startet_nicht).toBe(false);
  });

  // ── bol_ak (Point 128 addition) ───────────────────────────────────────────

  it('includes bol_ak = true when provided', () => {
    const data = buildWertungenUpdateData({ bol_ak: true });
    expect(data.bol_ak).toBe(true);
  });

  it('includes bol_ak = false when provided', () => {
    const data = buildWertungenUpdateData({ bol_ak: false });
    expect(data.bol_ak).toBe(false);
  });

  it('omits bol_ak when not provided', () => {
    const data = buildWertungenUpdateData({ squad_name: 'mRot' });
    expect(data).not.toHaveProperty('bol_ak');
  });

  // ── var_comment (Point 128 addition) ──────────────────────────────────────

  it('includes var_comment when provided', () => {
    const data = buildWertungenUpdateData({ var_comment: 'Verletzung' });
    expect(data.var_comment).toBe('Verletzung');
  });

  it('includes var_comment = empty string when explicitly set to empty', () => {
    const data = buildWertungenUpdateData({ var_comment: '' });
    expect(data.var_comment).toBe('');
  });

  it('omits var_comment when not provided', () => {
    const data = buildWertungenUpdateData({ startet_nicht: false });
    expect(data).not.toHaveProperty('var_comment');
  });

  // ── statusId / int_statusid (Point 128 — new field) ──────────────────────

  it('includes int_statusid when a valid statusId is provided', () => {
    const data = buildWertungenUpdateData({ statusId: 2 });
    expect(data.int_statusid).toBe(2);
  });

  it('includes int_statusid = 1 (kein Status)', () => {
    const data = buildWertungenUpdateData({ statusId: 1 });
    expect(data.int_statusid).toBe(1);
  });

  it('excludes int_statusid when statusId is 0 (invalid/legacy)', () => {
    // statusId=0 has no matching row in tfx_status; must not overwrite
    const data = buildWertungenUpdateData({ statusId: 0 });
    expect(data).not.toHaveProperty('int_statusid');
  });

  it('excludes int_statusid when statusId is negative', () => {
    const data = buildWertungenUpdateData({ statusId: -1 });
    expect(data).not.toHaveProperty('int_statusid');
  });

  it('excludes int_statusid when statusId is undefined', () => {
    const data = buildWertungenUpdateData({ squad_name: 'wGrün' });
    expect(data).not.toHaveProperty('int_statusid');
  });

  it('excludes int_statusid when statusId is a float', () => {
    // Non-integer must not be written to the DB column
    const data = buildWertungenUpdateData({ statusId: 2.5 as unknown as number });
    expect(data).not.toHaveProperty('int_statusid');
  });

  // ── Combined fields ───────────────────────────────────────────────────────

  it('assembles all five fields when all are provided', () => {
    const data = buildWertungenUpdateData({
      squad_name:    'wBlau',
      startet_nicht: false,
      bol_ak:        true,
      var_comment:   'Außer Konkurrenz',
      statusId:      3,
    });

    expect(data.var_riege).toBe('wBlau');
    expect(data.bol_startet_nicht).toBe(false);
    expect(data.bol_ak).toBe(true);
    expect(data.var_comment).toBe('Außer Konkurrenz');
    expect(data.int_statusid).toBe(3);
  });

  it('produces empty object when no fields are provided', () => {
    const data = buildWertungenUpdateData({});
    expect(Object.keys(data)).toHaveLength(0);
  });

  it('does not add extra keys beyond the expected ones', () => {
    const data = buildWertungenUpdateData({
      squad_name: 'mBlau',
      bol_ak:     false,
      statusId:   2,
    });
    const keys = Object.keys(data);
    expect(keys).toContain('var_riege');
    expect(keys).toContain('bol_ak');
    expect(keys).toContain('int_statusid');
    expect(keys).not.toContain('var_vorname');
    expect(keys).not.toContain('int_teilnehmerid');
  });
});

// ─── Tests: statusId included in GET /event-participants response ─────────────

describe('GET /event-participants — statusId field in response', () => {
  /**
   * Simulates the mapping logic applied to each raw DB row in eventParticipants.ts.
   * The mapper must include `statusId` in the returned object.
   */
  function mapParticipantRow(raw: {
    int_teilnehmerid: number;
    var_vorname: string;
    var_nachname: string;
    int_wertungenid: number;
    status_id: number | null;
  }) {
    return {
      id:          Number(raw.int_teilnehmerid),
      firstname:   raw.var_vorname,
      lastname:    raw.var_nachname,
      wertungenId: raw.int_wertungenid ? Number(raw.int_wertungenid) : null,
      statusId:    raw.status_id ? Number(raw.status_id) : 1,
    };
  }

  it('maps status_id from the DB row to statusId on the response object', () => {
    const result = mapParticipantRow({
      int_teilnehmerid: 5,
      var_vorname:      'Max',
      var_nachname:     'Muster',
      int_wertungenid:  100,
      status_id:        2,
    });

    expect(result.statusId).toBe(2);
  });

  it('defaults statusId to 1 when status_id is null', () => {
    const result = mapParticipantRow({
      int_teilnehmerid: 6,
      var_vorname:      'Sara',
      var_nachname:     'Schmidt',
      int_wertungenid:  200,
      status_id:        null,
    });

    expect(result.statusId).toBe(1);
  });

  it('defaults statusId to 1 when status_id is 0 (falsy)', () => {
    const result = mapParticipantRow({
      int_teilnehmerid: 7,
      var_vorname:      'Tom',
      var_nachname:     'Berg',
      int_wertungenid:  300,
      status_id:        0,
    });

    // status_id=0 is falsy → default to 1
    expect(result.statusId).toBe(1);
  });

  it('response object includes statusId key', () => {
    const result = mapParticipantRow({
      int_teilnehmerid: 1,
      var_vorname:      'Anna',
      var_nachname:     'Meier',
      int_wertungenid:  50,
      status_id:        3,
    });

    expect(result).toHaveProperty('statusId');
  });
});
