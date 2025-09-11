import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../utils/test-utils';

// Mock the LanguageContext
const mockLanguageContext = {
  currentLanguage: 'en',
  changeLanguage: vi.fn(),
  availableLanguages: [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  ],
};

vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => mockLanguageContext,
}));

// Mock Heroicons
vi.mock('@heroicons/react/24/outline', () => ({
  ChevronDownIcon: ({ className }: { className?: string }) => (
    <div data-testid="chevron-down-icon" className={className}>⌄</div>
  ),
  LanguageIcon: ({ className }: { className?: string }) => (
    <div data-testid="language-icon" className={className}>🌐</div>
  ),
}));

import LanguageSwitcher from '../../components/LanguageSwitcher';

describe('LanguageSwitcher', () => {
  it('renders the current language', () => {
    render(<LanguageSwitcher />);
    
    expect(screen.getByText('English')).toBeInTheDocument();
    expect(screen.getByText('🇺🇸')).toBeInTheDocument();
  });

  it('renders the language icon and chevron', () => {
    render(<LanguageSwitcher />);
    
    expect(screen.getByTestId('language-icon')).toBeInTheDocument();
    expect(screen.getByTestId('chevron-down-icon')).toBeInTheDocument();
  });

  it('opens dropdown when button is clicked', () => {
    render(<LanguageSwitcher />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    // Should show available languages
    expect(screen.getByText('Deutsch')).toBeInTheDocument();
    expect(screen.getByText('🇩🇪')).toBeInTheDocument();
  });

  it('calls changeLanguage when a language is selected', () => {
    render(<LanguageSwitcher />);
    
    // Open dropdown
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    // Click on German
    const germanOption = screen.getByText('Deutsch');
    fireEvent.click(germanOption);
    
    expect(mockLanguageContext.changeLanguage).toHaveBeenCalledWith('de');
  });

  it('closes dropdown when backdrop is clicked', () => {
    render(<LanguageSwitcher />);
    
    // Open dropdown
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    // Verify dropdown is open
    expect(screen.getByText('Deutsch')).toBeInTheDocument();
    
    // Click backdrop (fixed positioned div)
    const backdrop = document.querySelector('.fixed.inset-0');
    if (backdrop) {
      fireEvent.click(backdrop);
    }
    
    // Dropdown should be closed (Deutsch should not be visible)
    expect(screen.queryByText('Deutsch')).not.toBeInTheDocument();
  });

  it('handles missing language gracefully', () => {
    vi.mocked(mockLanguageContext).currentLanguage = 'fr';
    
    render(<LanguageSwitcher />);
    
    // Should fall back to language code
    expect(screen.getByText('fr')).toBeInTheDocument();
  });
});
