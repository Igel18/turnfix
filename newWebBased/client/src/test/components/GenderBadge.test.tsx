/**
 * GenderBadge Component Tests
 * 
 * Tests the GenderBadge component which uses:
 * - `value` prop (not `gender`) accepting GenderValue | string | boolean | number
 * - `normalizeGender()` from genderHelpers to standardize input
 * - i18next `t()` for localized labels
 * - Color-coded Tailwind classes per gender
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GenderBadge } from '../../components/GenderBadge';

// Mock react-i18next so translation keys resolve to readable text
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'common.gender.male': 'Männlich',
        'common.gender.female': 'Weiblich',
        'common.gender.both': 'Gemischt',
        'common.gender.unknown': 'Unbekannt',
      };
      return translations[key] || key;
    },
    i18n: { language: 'de' },
  }),
}));

describe('GenderBadge Component', () => {
  // --- Text rendering ---
  it('renders male badge with correct text', () => {
    render(<GenderBadge value="male" />);
    expect(screen.getByText('Männlich')).toBeInTheDocument();
  });

  it('renders female badge with correct text', () => {
    render(<GenderBadge value="female" />);
    expect(screen.getByText('Weiblich')).toBeInTheDocument();
  });

  it('renders mixed/both badge with correct text', () => {
    render(<GenderBadge value="both" />);
    expect(screen.getByText('Gemischt')).toBeInTheDocument();
  });

  it('renders unknown badge for unrecognized value', () => {
    render(<GenderBadge value="invalid" />);
    expect(screen.getByText('Unbekannt')).toBeInTheDocument();
  });

  // --- Normalization ---
  it('normalizes German gender value "männlich" to male', () => {
    render(<GenderBadge value="männlich" />);
    expect(screen.getByText('Männlich')).toBeInTheDocument();
  });

  it('normalizes database numeric 1 to male', () => {
    render(<GenderBadge value={1} />);
    expect(screen.getByText('Männlich')).toBeInTheDocument();
  });

  it('normalizes database numeric 2 to female', () => {
    render(<GenderBadge value={2} />);
    expect(screen.getByText('Weiblich')).toBeInTheDocument();
  });

  it('handles null value as unknown', () => {
    render(<GenderBadge value={null as any} />);
    expect(screen.getByText('Unbekannt')).toBeInTheDocument();
  });

  // --- Styling ---
  it('has correct blue styling for male', () => {
    render(<GenderBadge value="male" />);
    const badge = screen.getByText('Männlich');
    expect(badge).toHaveClass('bg-blue-100');
    expect(badge).toHaveClass('text-blue-800');
  });

  it('has correct pink styling for female', () => {
    render(<GenderBadge value="female" />);
    const badge = screen.getByText('Weiblich');
    expect(badge).toHaveClass('bg-pink-100');
    expect(badge).toHaveClass('text-pink-800');
  });

  it('has correct purple styling for both', () => {
    render(<GenderBadge value="both" />);
    const badge = screen.getByText('Gemischt');
    expect(badge).toHaveClass('bg-purple-100');
    expect(badge).toHaveClass('text-purple-800');
  });

  it('has correct gray styling for unknown', () => {
    render(<GenderBadge value="invalid" />);
    const badge = screen.getByText('Unbekannt');
    expect(badge).toHaveClass('bg-gray-100');
    expect(badge).toHaveClass('text-gray-600');
  });

  // --- Icon support ---
  it('shows icon when showIcon is true', () => {
    render(<GenderBadge value="male" showIcon />);
    expect(screen.getByText('♂')).toBeInTheDocument();
  });

  it('does not show icon by default', () => {
    render(<GenderBadge value="male" />);
    expect(screen.queryByText('♂')).not.toBeInTheDocument();
  });

  // --- Custom className ---
  it('applies custom className', () => {
    render(<GenderBadge value="male" className="my-custom-class" />);
    const badge = screen.getByText('Männlich');
    expect(badge).toHaveClass('my-custom-class');
  });
});
