/**
 * Regression tests: ScoringPanel (score-capture-v2) with linked formula "A + B - C".
 * Entering A=5, B=7,5 must give 12.50 — also while the parent feeds saved field
 * values back in (as ScoreCaptureV2 does after every per-field save).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React, { useState } from 'react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('lucide-react', () => ({ Trophy: () => <svg /> }));

import { ScoringPanel } from '@/pages/ScoreCaptureV2/components/ScoringPanel';

const fields = [
  { id: 101, name: 'D/A-Note', disciplineId: 7, enabled: true, isFinalScore: false, isStartingScore: false },
  { id: 102, name: 'E/B-Note', disciplineId: 7, enabled: true, isFinalScore: false, isStartingScore: false },
  { id: 103, name: 'Neutrale Abzüge', disciplineId: 7, enabled: true, isFinalScore: false, isStartingScore: false },
  { id: 104, name: 'Ausgangswert', disciplineId: 7, enabled: true, isFinalScore: false, isStartingScore: true },
  { id: 105, name: 'Endwert', disciplineId: 7, enabled: true, isFinalScore: true, isStartingScore: false },
] as any[];

const discipline = {
  int_disziplinid: 7, var_name: 'Boden', int_berechnung: 2, int_formelid: 9001, var_formel: '1*x',
} as any;

const participant = { id: 1, name: 'Anna', startNumber: 5, clubName: 'TV', currentScore: null, wertungenId: 1, statusId: null, statusName: null, statusColor: null } as any;

// Mimics ScoreCaptureV2: saved field values are fed back as fieldScores.
const Harness = ({ onFieldChange, onSave }: { onFieldChange: (id: number, v: string) => void; onSave: (v: any) => void }) => {
  const [fieldScores, setFieldScores] = useState<Record<number, number>>({});
  return (
    <ScoringPanel
      participant={participant}
      discipline={discipline}
      disciplineFields={fields}
      score=""
      fieldScores={fieldScores}
      participantCount={1}
      currentIndex={0}
      loading={false}
      onScoreChange={vi.fn()}
      onFieldChange={(id, v) => {
        onFieldChange(id, v);
        const n = parseFloat(v.replace(',', '.'));
        setFieldScores(prev => ({ ...prev, [id]: n }));
      }}
      onSave={onSave}
      onNavigate={vi.fn()}
      getScoreValidation={() => ({ isValid: true, message: '' })}
      statuses={[]}
      onStatusChange={vi.fn()}
    />
  );
};

const inputs = () => screen.getAllByRole('textbox') as HTMLInputElement[];
const result = () => screen.getByText('Berechnetes Ergebnis:').nextSibling as HTMLElement;
const type = async (el: HTMLInputElement, value: string) => {
  await act(async () => { fireEvent.change(el, { target: { value } }); });
};

describe('ScoreCaptureV2 ScoringPanel – A + B - C', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ json: async () => ({ var_formel: 'A + B - C' }) })));
  });

  it('renders one input per formula symbol mapped to the first three non-start/non-final fields', async () => {
    await act(async () => { render(<Harness onFieldChange={vi.fn()} onSave={vi.fn()} />); });
    expect(inputs()).toHaveLength(3);
    expect(screen.getByText('A: D/A-Note')).toBeInTheDocument();
    expect(screen.getByText('B: E/B-Note')).toBeInTheDocument();
    expect(screen.getByText('C: Neutrale Abzüge')).toBeInTheDocument();
  });

  it('A=5, B=7,5 (C untouched) results in 12.50', async () => {
    await act(async () => { render(<Harness onFieldChange={vi.fn()} onSave={vi.fn()} />); });
    await type(inputs()[0], '5');
    await type(inputs()[1], '7,');
    await type(inputs()[1], '7,5');

    expect(result()).toHaveTextContent('12.50');
    expect(inputs()[0].value).toBe('5');
    expect(inputs()[1].value).toBe('7,5');
  });

  it('A=5, B=7,5, C=1 results in 11.50', async () => {
    await act(async () => { render(<Harness onFieldChange={vi.fn()} onSave={vi.fn()} />); });
    await type(inputs()[0], '5');
    await type(inputs()[1], '7,5');
    await type(inputs()[2], '1');

    expect(result()).toHaveTextContent('11.50');
  });

  it('entering B before A gives the same result', async () => {
    await act(async () => { render(<Harness onFieldChange={vi.fn()} onSave={vi.fn()} />); });
    await type(inputs()[1], '7,5');
    await type(inputs()[0], '5');

    expect(result()).toHaveTextContent('12.50');
  });

  it('keeps typed values when saved field values come back from the parent late (stale feedback)', async () => {
    const props = {
      participant, discipline, disciplineFields: fields, score: '', participantCount: 1, currentIndex: 0,
      loading: false, onScoreChange: vi.fn(), onFieldChange: vi.fn(), onSave: vi.fn(), onNavigate: vi.fn(),
      getScoreValidation: () => ({ isValid: true, message: '' }), statuses: [], onStatusChange: vi.fn(),
    } as any;
    let view: ReturnType<typeof render>;
    await act(async () => { view = render(<ScoringPanel {...props} fieldScores={{}} />); });

    await type(inputs()[0], '5');
    await type(inputs()[1], '7,5');
    // Feedback for the first save (only A) arrives after B was typed
    await act(async () => { view.rerender(<ScoringPanel {...props} fieldScores={{ 101: 5 }} />); });

    expect(inputs()[1].value).not.toBe('');
    expect(result()).toHaveTextContent('12.50');
  });

  it('saves the correct endwert and saves each field under its own field id', async () => {
    const onFieldChange = vi.fn();
    const onSave = vi.fn();
    await act(async () => { render(<Harness onFieldChange={onFieldChange} onSave={onSave} />); });
    await type(inputs()[0], '5');
    await type(inputs()[1], '7,5');

    await act(async () => { fireEvent.click(screen.getByTestId('save-score-button')); });

    expect(onSave).toHaveBeenLastCalledWith(12.5);
    const lastValueByField: Record<number, string> = {};
    onFieldChange.mock.calls.forEach(([id, v]) => { lastValueByField[id] = v; });
    expect(lastValueByField[101]).toBe('5');
    expect(lastValueByField[102]).toBe('7.5');
  });
});
