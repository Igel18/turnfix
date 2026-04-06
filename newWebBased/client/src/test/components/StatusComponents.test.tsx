/**
 * TDD tests for shared StatusBadge and StatusDropdown components.
 *
 * These components are the single source of truth for all status
 * visualisation across ScoreCaptureV2, Jury Portal, and Squad/Participant
 * status management pages.
 *
 * StatusOption contract matches what the server returns from:
 *   GET /api/participant-status/statuses
 *   → [{ id, name, colorCode }]
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StatusBadge, StatusDropdown } from '@turnfix/shared';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string, fb?: string) => fb ?? k }),
}));

// ── StatusBadge tests ──────────────────────────────────────────────────────

describe('StatusBadge', () => {
  it('renders the status name', () => {
    render(<StatusBadge name="Meldung erfasst" colorCode="{249,105,5}" />);
    expect(screen.getByText('Meldung erfasst')).toBeTruthy();
  });

  it('renders "—" when name is null', () => {
    render(<StatusBadge name={null} colorCode={null} />);
    expect(screen.getByText('—')).toBeTruthy();
  });

  it('applies background color from colorCode (light color keeps original hue)', () => {
    // {249,105,5} has brightness 136.7 > 128 → background stays rgb(249,105,5)
    const { container } = render(
      <StatusBadge name="Test" colorCode="{249,105,5}" />
    );
    const badge = container.querySelector('span') as HTMLElement;
    expect(badge.style.backgroundColor).toContain('rgb(249, 105, 5)');
  });

  it('renders with fallback style when colorCode is null', () => {
    const { container } = render(<StatusBadge name="Test" colorCode={null} />);
    const badge = container.querySelector('span');
    expect(badge).toBeTruthy();
  });

  it('renders as a button when onClick is given', () => {
    const onClick = vi.fn();
    render(<StatusBadge name="Test" colorCode="{0,0,255}" onClick={onClick} />);
    const btn = screen.getByRole('button');
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders as a span when no onClick', () => {
    const { container } = render(<StatusBadge name="Test" colorCode="{0,255,0}" />);
    expect(container.querySelector('button')).toBeNull();
    expect(container.querySelector('span')).toBeTruthy();
  });
});

// ── StatusDropdown tests ───────────────────────────────────────────────────

const mockStatuses = [
  { id: 3, name: 'Meldung erfasst',   colorCode: '{249,105,5}' },
  { id: 4, name: 'Riegen eingeteilt', colorCode: '{251,170,12}' },
];

describe('StatusDropdown', () => {
  it('renders a select element', () => {
    render(
      <StatusDropdown
        statuses={mockStatuses}
        value={null}
        onChange={() => {}}
      />
    );
    expect(screen.getByRole('combobox')).toBeTruthy();
  });

  it('renders an option for each status', () => {
    render(
      <StatusDropdown
        statuses={mockStatuses}
        value={null}
        onChange={() => {}}
      />
    );
    expect(screen.getByText('Meldung erfasst')).toBeTruthy();
    expect(screen.getByText('Riegen eingeteilt')).toBeTruthy();
  });

  it('renders a "no status" placeholder option', () => {
    render(
      <StatusDropdown
        statuses={mockStatuses}
        value={null}
        onChange={() => {}}
        placeholder="Kein Status"
      />
    );
    expect(screen.getByText('Kein Status')).toBeTruthy();
  });

  it('calls onChange with the numeric id when selection changes', () => {
    const onChange = vi.fn();
    render(
      <StatusDropdown
        statuses={mockStatuses}
        value={null}
        onChange={onChange}
      />
    );
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: '3' } });
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('calls onChange with null when placeholder selected', () => {
    const onChange = vi.fn();
    render(
      <StatusDropdown
        statuses={mockStatuses}
        value={3}
        onChange={onChange}
      />
    );
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: '' } });
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('reflects the current value', () => {
    render(
      <StatusDropdown
        statuses={mockStatuses}
        value={4}
        onChange={() => {}}
      />
    );
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('4');
  });

  it('disables the select when disabled={true}', () => {
    render(
      <StatusDropdown
        statuses={mockStatuses}
        value={null}
        onChange={() => {}}
        disabled={true}
      />
    );
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.disabled).toBe(true);
  });

  it('renders empty list when statuses is empty', () => {
    render(
      <StatusDropdown
        statuses={[]}
        value={null}
        onChange={() => {}}
      />
    );
    const select = screen.getByRole('combobox');
    // Only the placeholder option
    expect((select as HTMLSelectElement).options.length).toBe(1);
  });
});
