import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactElement, ReactNode } from 'react';
import { vi } from 'vitest';
import React from 'react';

// Mock API base URL for tests
export const TEST_API_BASE = 'http://localhost:3002';

// Mock i18n with proper translations
const translations: Record<string, string> = {
  'home.title': 'TurnFix Gymnastics Management',
  'home.welcome': 'Welcome to TurnFix',
  'home.description': 'Comprehensive gymnastics competition management system',
  'home.enterDashboard': 'Enter Dashboard',
  'home.viewEvents': 'View Events',
  'home.databaseConfig': 'Database Config',
  'home.authNote': 'Login required for full access',
  'home.recentActivities.title': 'Recent Activities',
  'participants.title': 'Participants',
  'participants.search': 'Search participants...',
  'participants.filterByClub': 'Filter by club',
  'participants.filterByGender': 'Filter by gender',
  'participants.filterByAge': 'Filter by age',
  'participants.addNew': 'Add New Participant',
  'participants.edit': 'Edit',
  'participants.delete': 'Delete',
  'participants.viewDetails': 'View Details',
  'participants.noData': 'No participants found',
  'disciplines.title': 'Disciplines',
  'disciplines.search': 'Search disciplines...',
  'disciplines.addNew': 'Add New Discipline',
  'disciplines.edit': 'Edit',
  'disciplines.delete': 'Delete',
  'disciplines.noData': 'No disciplines found',
  'events.title': 'Events',
  'events.search': 'Search events...',
  'events.addNew': 'Add New Event',
  'events.edit': 'Edit',
  'events.delete': 'Delete',
  'events.noData': 'No events found',
  'results.title': 'Results',
  'results.search': 'Search results...',
  'results.noData': 'No results found',
  'common.loading': 'Loading...',
  'common.error': 'An error occurred',
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.confirm': 'Confirm',
  'common.male': 'Male',
  'common.female': 'Female',
  'common.active': 'Active',
  'common.inactive': 'Inactive',
  'common.tableView': 'Table View',
  'common.cardView': 'Card View',
  'common.previous': 'Previous',
  'common.next': 'Next',
  'common.page': 'Page',
  'common.of': 'of',
  'common.results': 'results',
  'common.reset': 'Reset',
  'common.apply': 'Apply',
};

const mockTFunction = (key: string, options?: any) => {
  const translation = translations[key];
  if (translation) {
    return translation;
  }
  if (options?.defaultValue) {
    return options.defaultValue;
  }
  return key;
};

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: mockTFunction,
    i18n: {
      changeLanguage: () => new Promise(() => {}),
      language: 'en',
    },
  }),
  Trans: ({ children }: any) => children,
  initReactI18next: {
    type: '3rdParty',
    init: () => {},
  },
}));

// Mock data generators
export const generateMockParticipants = (count: number = 10) => {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    startnummer: 1000 + i,
    vorname: `TestFirstname${i + 1}`,
    nachname: `TestLastname${i + 1}`,
    geschlecht: i % 2 === 0 ? 1 : 2, // 1 = male, 2 = female
    geburtsdatum: new Date(2000 + (i % 20), i % 12, (i % 28) + 1).toISOString().split('T')[0],
    verein_id: (i % 5) + 1,
    verein: {
      id: (i % 5) + 1,
      name: `Test Club ${(i % 5) + 1}`,
      kurzname: `TC${(i % 5) + 1}`,
    },
    // Calculate age from birth date
    get age() {
      const birthDate = new Date(this.geburtsdatum);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    }
  }));
};

export const generateMockDisciplines = (count: number = 8) => {
  const disciplineNames = ['Floor Exercise', 'Pommel Horse', 'Still Rings', 'Vault', 'Parallel Bars', 'Horizontal Bar', 'Uneven Bars', 'Balance Beam'];
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: disciplineNames[i] || `Test Discipline ${i + 1}`,
    kurzname: `TD${i + 1}`,
    reihenfolge: i + 1,
    aktiv: i % 3 !== 0, // Most active, some inactive
    maennlich: i < 6, // First 6 are for men
    weiblich: i >= 3, // Last 5 are for women (some overlap)
    icon: `🤸${i % 2 === 0 ? '‍♂️' : '‍♀️'}`,
  }));
};

export const generateMockEvents = (count: number = 5) => {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `Test Event ${i + 1}`,
    datum: new Date(2024, i % 12, (i % 28) + 1).toISOString().split('T')[0],
    startzeit: `${8 + (i % 10)}:00`,
    endzeit: `${18 + (i % 6)}:00`,
    ort: `Test Venue ${i + 1}`,
    beschreibung: `Test event description ${i + 1}`,
    aktiv: i % 4 !== 0, // Most active
    competitions: []
  }));
};

// Mock fetch for API calls with realistic responses
const createMockResponse = (data: any, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: () => Promise.resolve(data),
  headers: new Headers(),
  redirected: false,
  statusText: status === 200 ? 'OK' : 'Error',
  type: 'basic' as ResponseType,
  url: '',
  clone: vi.fn(),
  body: null,
  bodyUsed: false,
  arrayBuffer: vi.fn(),
  blob: vi.fn(),
  formData: vi.fn(),
  text: vi.fn(),
});

export const mockFetch = vi.fn((input: RequestInfo | URL) => {
  const url = input.toString();
  
  if (url.includes('/api/participants')) {
    return Promise.resolve(createMockResponse({ data: generateMockParticipants() }));
  }
  
  if (url.includes('/api/disciplines')) {
    return Promise.resolve(createMockResponse({ data: generateMockDisciplines() }));
  }
  
  if (url.includes('/api/events')) {
    return Promise.resolve(createMockResponse({ data: generateMockEvents() }));
  }
  
  if (url.includes('/api/clubs')) {
    return Promise.resolve(createMockResponse({ 
      data: Array.from({ length: 5 }, (_, i) => ({
        id: i + 1,
        name: `Test Club ${i + 1}`,
        kurzname: `TC${i + 1}`,
      }))
    }));
  }
  
  // Default response for any other API calls
  return Promise.resolve(createMockResponse({ data: [] }));
});

global.fetch = mockFetch as any;

// Setup common mocks function for all tests
export function setupCommonMocks() {
  // Mock fetch API
  global.fetch = mockFetch as any;

  // Mock window.scrollTo
  Object.defineProperty(window, 'scrollTo', {
    value: vi.fn(),
    writable: true,
  });

  // Mock HTMLElement.scrollIntoView  
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    value: vi.fn(),
    writable: true,
  });

  // Mock localStorage
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  };
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
  });

  // Mock sessionStorage
  Object.defineProperty(window, 'sessionStorage', {
    value: localStorageMock,
  });

  // Mock window.location
  Object.defineProperty(window, 'location', {
    value: {
      href: 'http://localhost:5173',
      pathname: '/',
      search: '',
      hash: '',
      assign: vi.fn(),
      reload: vi.fn(),
      replace: vi.fn(),
    },
    writable: true,
  });

  // Mock console methods to reduce noise in tests
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
}

// Test query client with shorter retry settings
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      gcTime: 0,
    },
    mutations: {
      retry: false,
    },
  },
});

// Mock EventProvider for tests that need it
const MockEventProvider = ({ children }: { children: React.ReactNode }) => {
  // Create a simple provider that doesn't require the actual EventProvider
  return React.createElement('div', { 'data-testid': 'mock-event-provider' }, children);
};

// Custom render function with providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
}

export function renderWithProviders(
  ui: ReactElement,
  options: CustomRenderOptions = {}
) {
  const { queryClient = createTestQueryClient(), ...renderOptions } = options;

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <MockEventProvider>
          {children}
        </MockEventProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
  };
}

// Re-export everything from testing library
export * from '@testing-library/react';
export { renderWithProviders as render };
