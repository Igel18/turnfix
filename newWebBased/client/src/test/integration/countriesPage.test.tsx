/**
 * MSW-Powered Integration Test — Countries Page
 */

import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../msw/server';
import { renderWithProviders } from '../renderWithProviders';
import Countries from '../../pages/Countries';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
  I18nextProvider: ({ children }: { children: React.ReactNode }) => children,
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}));

describe('Countries Page (MSW Integration)', () => {
  it('renders the page title and loaded data', async () => {
    renderWithProviders(<Countries />);

    await waitFor(() => {
      expect(screen.getByText('countries.title')).toBeInTheDocument();
      expect(screen.getByText('Deutschland')).toBeInTheDocument();
      expect(screen.getByText('Österreich')).toBeInTheDocument();
    });
  });

  it('supports search filtering', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Countries />);

    await waitFor(() => {
      expect(screen.getByText('Deutschland')).toBeInTheDocument();
    });

    const filterButton = screen.queryByRole('button', { name: /common\.filter|filter/i });
    if (filterButton) {
      await user.click(filterButton);
    }

    const searchInput =
      screen.queryByRole('searchbox') ||
      screen.queryByPlaceholderText('countries.searchPlaceholder') ||
      screen.queryByPlaceholderText('Search...');

    expect(searchInput).toBeTruthy();
    if (!searchInput) {
      throw new Error('Search input not found');
    }
    await user.type(searchInput, 'Österreich');

    expect(screen.getByText('Österreich')).toBeInTheDocument();
    expect(screen.queryByText('Deutschland')).not.toBeInTheDocument();
  });

  it('opens the shared create modal', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Countries />);

    await waitFor(() => {
      expect(screen.getByText('countries.title')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'countries.addCountry' }));

    expect(screen.getByText('countries.addNewCountry')).toBeInTheDocument();
    expect(screen.getByText('countries.form.name')).toBeInTheDocument();
    expect(screen.getByText('countries.form.abbreviation')).toBeInTheDocument();
  });

  it('shows an error banner when the API fails', async () => {
    server.use(
      http.get('/api/countries', () => HttpResponse.json({ error: 'fail' }, { status: 500 }))
    );

    renderWithProviders(<Countries />);

    await waitFor(() => {
      expect(screen.getByText('countries.messages.loadError')).toBeInTheDocument();
    });
  });
});