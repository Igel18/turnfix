import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import TeamFormModal from '@/components/TeamFormModal';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe('Team competition selection', () => {
  it('shows competition numbers so similarly named competitions can be distinguished', () => {
    render(
      <TeamFormModal isOpen onClose={vi.fn()} onSubmit={vi.fn()} setFormData={vi.fn()} isEditing={false}
        formData={{ clubId: '', competitionId: '', number: '1', riege: null, startNumber: '' }}
        clubs={[]}
        competitions={[{ id: 1, number: '101', name: 'Turnen', competitionType: 1 }, { id: 2, number: '102', name: 'Turnen', competitionType: 1 }]} />
    );
    expect(screen.getByRole('option', { name: '101 – Turnen' })).toBeTruthy();
    expect(screen.getByRole('option', { name: '102 – Turnen' })).toBeTruthy();
  });

  it('shows individual competitions as unavailable instead of hiding them', () => {
    render(
      <TeamFormModal isOpen onClose={vi.fn()} onSubmit={vi.fn()} setFormData={vi.fn()} isEditing={false}
        formData={{ clubId: '1', competitionId: '', number: '1', riege: null, startNumber: '' }}
        clubs={[{ int_vereineid: 1, var_name: 'TV' }]}
        competitions={[{ id: 1, number: '101', name: 'Einzel', competitionType: 0 }]} />
    );
    expect(screen.getByRole('option', { name: /101 – Einzel/ })).toBeDisabled();
    expect(screen.getByText(/teams\.form\.noCompetitionsAvailable/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'common.create' })).toBeDisabled();
  });

  it('allows editing a legacy team that is already assigned to an individual competition', () => {
    render(
      <TeamFormModal isOpen onClose={vi.fn()} onSubmit={vi.fn()} setFormData={vi.fn()} isEditing
        formData={{ clubId: '1', competitionId: '1', number: '1', riege: null, startNumber: '' }}
        clubs={[{ int_vereineid: 1, var_name: 'TV' }]}
        competitions={[{ id: 1, number: '101', name: 'Einzel', competitionType: 0 }]} />
    );
    expect(screen.getByRole('option', { name: /101 – Einzel/ })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: 'common.save' })).toBeEnabled();
  });
});
