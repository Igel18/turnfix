/**
 * Shared Test Rendering Utility
 *
 * Wraps components in the required providers (QueryClient, Router, i18n)
 * so integration tests don't have to repeat this boilerplate.
 */

import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';

interface WrapperOptions {
  /** Initial URL for memory router (default: '/') */
  route?: string;
  /** Use MemoryRouter instead of BrowserRouter (for specific route testing) */
  useMemoryRouter?: boolean;
  /** Pre-configured QueryClient (default: fresh no-retry client) */
  queryClient?: QueryClient;
}

/**
 * Creates a fresh QueryClient configured for tests:
 * - No retries (tests should fail fast)
 * - No refetch on window focus
 * - Very short cache time
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/**
 * Renders a component wrapped in all required providers.
 *
 * @example
 * const { getByText } = renderWithProviders(<MyPage />);
 * expect(getByText('Title')).toBeInTheDocument();
 *
 * @example With route
 * renderWithProviders(<MyPage />, { route: '/events/1', useMemoryRouter: true });
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: WrapperOptions & Omit<RenderOptions, 'wrapper'>
) {
  const {
    route = '/',
    useMemoryRouter = false,
    queryClient = createTestQueryClient(),
    ...renderOptions
  } = options || {};

  function Wrapper({ children }: { children: React.ReactNode }) {
    const Router = useMemoryRouter
      ? ({ children: c }: { children: React.ReactNode }) => (
          <MemoryRouter initialEntries={[route]}>{c}</MemoryRouter>
        )
      : BrowserRouter;

    return (
      <QueryClientProvider client={queryClient}>
        <Router>{children}</Router>
      </QueryClientProvider>
    );
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
  };
}
