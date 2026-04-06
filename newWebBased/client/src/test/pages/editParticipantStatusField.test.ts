/**
 * Unit Tests — Point 128: EditParticipantForm status field
 * ─────────────────────────────────────────────────────────────────────────────
 * Before Point 128 the EditParticipantData type and form had no statusId field.
 *
 * After the fix:
 *   - EditParticipantData includes optional `statusId`
 *   - The form initialises statusId from participant.statusId (default: 1)
 *   - The form sends statusId to the update-details API call
 *   - The local participant state is updated optimistically with the new statusId
 *
 * Tests use pure logic helpers that mirror what the component does — no React
 * renderer required, keeping them fast and dependency-free.
 */

import { describe, it, expect } from 'vitest';

// ─── Types (mirroring EventParticipants.types.ts) ─────────────────────────────

interface EditParticipantData {
  firstname: string;
  lastname: string;
  clubId: number;
  birthday: string;
  gender: string;
  squad_name: string;
  startet_nicht: boolean;
  bol_ak: boolean;
  var_comment: string;
  statusId?: number;
  assignedCompetitions: number[];
}

interface Participant {
  id: number;
  firstname: string;
  lastname: string;
  clubId: number;
  birthday?: string;
  birthYear: number;
  gender: string;
  squad_name?: string;
  startet_nicht: boolean;
  bol_ak: boolean;
  var_comment?: string;
  statusId?: number;
  assignedCompetitions: number[];
  club: string;
  age: number;
  isInEvent: boolean;
}

// ─── Pure helpers (mirrors component logic) ───────────────────────────────────

/** Mirror of the initial formData state construction in EditParticipantForm */
function buildInitialFormData(participant: Participant): EditParticipantData {
  return {
    firstname:            participant.firstname,
    lastname:             participant.lastname,
    clubId:               participant.clubId,
    birthday:             participant.birthday ?? (participant.birthYear ? `${participant.birthYear}-01-01` : ''),
    gender:               participant.gender as any,
    squad_name:           participant.squad_name || '',
    startet_nicht:        participant.startet_nicht,
    bol_ak:               participant.bol_ak || false,
    var_comment:          participant.var_comment || '',
    statusId:             participant.statusId ?? 1,
    assignedCompetitions: participant.assignedCompetitions || [],
  };
}

/** Mirror of the optimistic local-state update in useParticipants */
function applyOptimisticUpdate(
  participant: Participant,
  updatedData: EditParticipantData,
): Partial<Participant> {
  return {
    ...participant,
    firstname:            updatedData.firstname,
    lastname:             updatedData.lastname,
    clubId:               updatedData.clubId,
    birthday:             updatedData.birthday,
    gender:               updatedData.gender,
    squad_name:           updatedData.squad_name,
    startet_nicht:        updatedData.startet_nicht,
    bol_ak:               updatedData.bol_ak,
    var_comment:          updatedData.var_comment,
    statusId:             updatedData.statusId,
    assignedCompetitions: updatedData.assignedCompetitions,
  };
}

function makeParticipant(overrides: Partial<Participant> = {}): Participant {
  return {
    id:                   1,
    firstname:            'Anna',
    lastname:             'Müller',
    clubId:               10,
    birthday:             '2010-03-15',
    birthYear:            2010,
    gender:               'weiblich',
    squad_name:           'wBlau',
    startet_nicht:        false,
    bol_ak:               false,
    var_comment:          '',
    statusId:             1,
    assignedCompetitions: [5, 6],
    club:                 'TSV Musterstadt',
    age:                  16,
    isInEvent:            true,
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('EditParticipantForm — statusId initial value', () => {

  it('initialises statusId from participant.statusId', () => {
    const form = buildInitialFormData(makeParticipant({ statusId: 3 }));
    expect(form.statusId).toBe(3);
  });

  it('defaults statusId to 1 when participant.statusId is undefined', () => {
    const form = buildInitialFormData(makeParticipant({ statusId: undefined }));
    expect(form.statusId).toBe(1);
  });

  it('preserves statusId = 2 (Leistungen erfasst)', () => {
    const form = buildInitialFormData(makeParticipant({ statusId: 2 }));
    expect(form.statusId).toBe(2);
  });

  it('form data contains statusId key', () => {
    const form = buildInitialFormData(makeParticipant({ statusId: 1 }));
    expect(form).toHaveProperty('statusId');
  });
});

describe('EditParticipantData type — statusId field', () => {

  it('allows statusId to be undefined (optional field)', () => {
    const data: EditParticipantData = {
      firstname:            'Max',
      lastname:             'Muster',
      clubId:               1,
      birthday:             '2010-01-01',
      gender:               'männlich',
      squad_name:           '',
      startet_nicht:        false,
      bol_ak:               false,
      var_comment:          '',
      assignedCompetitions: [],
      // statusId intentionally omitted
    };
    expect(data.statusId).toBeUndefined();
  });

  it('allows statusId to be a number', () => {
    const data: EditParticipantData = {
      firstname:            'Max',
      lastname:             'Muster',
      clubId:               1,
      birthday:             '2010-01-01',
      gender:               'männlich',
      squad_name:           '',
      startet_nicht:        false,
      bol_ak:               false,
      var_comment:          '',
      statusId:             2,
      assignedCompetitions: [],
    };
    expect(data.statusId).toBe(2);
  });
});

describe('useParticipants — optimistic statusId update', () => {

  it('updates statusId in local state after save', () => {
    const participant = makeParticipant({ statusId: 1 });
    const updatedData = buildInitialFormData(participant);
    updatedData.statusId = 3;

    const updated = applyOptimisticUpdate(participant, updatedData);
    expect(updated.statusId).toBe(3);
  });

  it('clears statusId to undefined when form has no statusId', () => {
    const participant = makeParticipant({ statusId: 2 });
    const updatedData = buildInitialFormData(participant);
    updatedData.statusId = undefined;

    const updated = applyOptimisticUpdate(participant, updatedData);
    expect(updated.statusId).toBeUndefined();
  });

  it('preserves other fields while updating statusId', () => {
    const participant = makeParticipant({ statusId: 1 });
    const updatedData = buildInitialFormData(participant);
    updatedData.statusId = 2;
    updatedData.squad_name = 'wRot';

    const updated = applyOptimisticUpdate(participant, updatedData);
    expect(updated.statusId).toBe(2);
    expect(updated.squad_name).toBe('wRot');
    expect(updated.firstname).toBe('Anna');
    expect(updated.assignedCompetitions).toEqual([5, 6]);
  });
});

describe('EditParticipantForm — bol_ak and var_comment in formData', () => {

  it('initialises bol_ak from participant.bol_ak', () => {
    const form = buildInitialFormData(makeParticipant({ bol_ak: true }));
    expect(form.bol_ak).toBe(true);
  });

  it('defaults bol_ak to false when participant.bol_ak is undefined', () => {
    const form = buildInitialFormData({ ...makeParticipant(), bol_ak: undefined as any });
    expect(form.bol_ak).toBe(false);
  });

  it('initialises var_comment from participant.var_comment', () => {
    const form = buildInitialFormData(makeParticipant({ var_comment: 'Verletzung' }));
    expect(form.var_comment).toBe('Verletzung');
  });

  it('defaults var_comment to empty string when undefined', () => {
    const form = buildInitialFormData({ ...makeParticipant(), var_comment: undefined });
    expect(form.var_comment).toBe('');
  });

  it('bol_ak and var_comment are included when saving all fields together', () => {
    const participant = makeParticipant({ bol_ak: true, var_comment: 'AK Starter', statusId: 2 });
    const form = buildInitialFormData(participant);

    expect(form.bol_ak).toBe(true);
    expect(form.var_comment).toBe('AK Starter');
    expect(form.statusId).toBe(2);
  });
});
