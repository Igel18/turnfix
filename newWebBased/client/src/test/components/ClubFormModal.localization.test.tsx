import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../renderWithProviders';
import ClubFormModal from '../../components/ClubFormModal';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'de', changeLanguage: vi.fn() },
  }),
  I18nextProvider: ({ children }: { children: React.ReactNode }) => children,
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}));

describe('ClubFormModal localization', () => {
  const baseProps = {
    isOpen: true,
    onClose: vi.fn(),
    editingClub: null as any,
    formData: {
      var_name: '',
      var_website: '',
      int_gaueid: '',
      int_personenid: '',
      int_start_ort: '0',
    },
    setFormData: vi.fn(),
    onSubmit: vi.fn((e: React.FormEvent) => e.preventDefault()),
    regions: [],
    contacts: [],
  };

  it('renders i18n keys instead of hardcoded English strings in create mode', () => {
    renderWithProviders(<ClubFormModal {...baseProps} />);

    expect(screen.getByText('clubs.addClub')).toBeInTheDocument();
    expect(screen.getByText('clubs.form.basicInformation')).toBeInTheDocument();
    expect(screen.getByText('clubs.form.organization')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('clubs.form.namePlaceholder')).toBeInTheDocument();
    expect(screen.getByText('clubs.form.noRegionsAvailable')).toBeInTheDocument();
    expect(screen.getByText('clubs.form.noContactsAvailable')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'clubs.form.createClubAction' })).toBeInTheDocument();

    expect(screen.queryByText('Basic Information')).not.toBeInTheDocument();
    expect(screen.queryByText('Organization')).not.toBeInTheDocument();
    expect(screen.queryByText('Create New Club')).not.toBeInTheDocument();
  });

  it('renders localized update action in edit mode', () => {
    const editingClub = {
      int_vereineid: 1,
      var_name: 'Testverein',
      int_gaueid: 1,
      int_start_ort: 0,
      athlete_count: 0,
    };

    renderWithProviders(
      <ClubFormModal
        {...baseProps}
        editingClub={editingClub}
        formData={{
          ...baseProps.formData,
          var_name: 'Testverein',
          int_gaueid: '1',
        }}
      />
    );

    expect(screen.getByText('clubs.editClub')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'clubs.form.updateClubAction' })).toBeInTheDocument();
  });
});
