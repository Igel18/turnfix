/**
 * TDD Tests — EditParticipantForm: Birthday field initialisation (Issue #102)
 *
 * Problem:
 *   In event-participants "Teilnehmer bearbeiten" the birthday date input always
 *   shows "01.01." because the Participant type only carries `birthYear` (integer)
 *   and the form constructs `YYYY-01-01`. Day and month are lost.
 *
 * Expected behaviour after fix:
 *   - The API (and Participant object) includes a `birthday` field (YYYY-MM-DD)
 *   - EditParticipantForm initialises its `<input type="date">` from `birthday`
 *   - When `birthday` is present it takes precedence over `birthYear`
 *   - When only `birthYear` is available (fallback) the old logic still runs
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import type { Participant } from '../../pages/EventParticipants/EventParticipants.types';

// ── i18n mock ────────────────────────────────────────────────────────────
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, any>) => {
      if (params) return `${key}(${JSON.stringify(params)})`;
      return key;
    },
    i18n: { language: 'de', changeLanguage: vi.fn() },
  }),
}));

// ── genderHelpers mock ───────────────────────────────────────────────────
vi.mock('@/utils/genderHelpers', () => ({
  normalizeGender: (g: string) => g || 'männlich',
}));

// ── useParticipantValidation mock ────────────────────────────────────────
vi.mock('../../pages/EventParticipants/hooks/useParticipantValidation', () => ({
  useParticipantValidation: () => ({
    calculateAge: (bd: string) => {
      if (!bd) return 0;
      return new Date().getFullYear() - new Date(bd).getFullYear();
    },
    validateCompetition: vi.fn(() => null),
  }),
}));

import { EditParticipantForm } from '../../pages/EventParticipants/components/EditParticipantForm';

// ── helpers ───────────────────────────────────────────────────────────────

function buildParticipant(overrides: Partial<Participant> = {}): Participant {
  return {
    id: 1,
    firstname: 'Max',
    lastname: 'Müller',
    club: 'TSV München',
    clubId: 1,
    gender: 'männlich' as any,
    birthYear: 2005,
    age: 20,
    squad_name: '',
    startet_nicht: false,
    bol_ak: false,
    var_comment: '',
    isInEvent: true,
    assignedCompetitions: [],
    ...overrides,
  };
}

function renderForm(participant: Participant) {
  return render(
    <EditParticipantForm
      participant={participant}
      clubs={[{ id: 1, name: 'TSV München' }]}
      competitions={[]}
      onSave={vi.fn()}
      onCancel={vi.fn()}
    />
  );
}

// ── tests ─────────────────────────────────────────────────────────────────

describe('EditParticipantForm — birthday initialisation', () => {
  it('shows the full birthday (day + month + year) when birthday field is provided', () => {
    // participant has full birthday — form must show the full date, not a fallback
    const participant = buildParticipant({ birthday: '2005-03-22', birthYear: 2005 });
    renderForm(participant);

    const dateInput = screen.getByDisplayValue('2005-03-22');
    expect(dateInput).toBeTruthy();
  });

  it('input value must include correct month (March = 03), not default 01', () => {
    const participant = buildParticipant({ birthday: '2005-03-22', birthYear: 2005 });
    renderForm(participant);

    const dateInput = screen.getByDisplayValue('2005-03-22') as HTMLInputElement;
    // The month portion must be "03", NOT "01"
    expect(dateInput.value).toContain('-03-');
  });

  it('input value must include correct day (22), not default 01', () => {
    const participant = buildParticipant({ birthday: '2005-03-22', birthYear: 2005 });
    renderForm(participant);

    const dateInput = screen.getByDisplayValue('2005-03-22') as HTMLInputElement;
    // The day portion must be "22", NOT "01"
    expect(dateInput.value).toMatch(/-22$/);
  });

  it('does NOT produce a "01-01" date when birthday is provided', () => {
    const participant = buildParticipant({ birthday: '2005-03-22', birthYear: 2005 });
    renderForm(participant);

    const dateInput = screen.getByDisplayValue('2005-03-22') as HTMLInputElement;
    expect(dateInput.value).not.toContain('-01-01');
  });

  it('falls back to YYYY-01-01 when only birthYear is available (legacy row)', () => {
    // Some legacy participants may not have birthday populated
    const participant = buildParticipant({ birthday: undefined, birthYear: 2003 });
    renderForm(participant);

    const dateInput = screen.getByDisplayValue('2003-01-01') as HTMLInputElement;
    expect(dateInput).toBeTruthy();
    expect(dateInput.value).toBe('2003-01-01');
  });

  it('birthday from a November birthday is preserved correctly', () => {
    const participant = buildParticipant({ birthday: '2008-11-05', birthYear: 2008 });
    renderForm(participant);

    const dateInput = screen.getByDisplayValue('2008-11-05') as HTMLInputElement;
    expect(dateInput.value).toBe('2008-11-05');
  });
});
