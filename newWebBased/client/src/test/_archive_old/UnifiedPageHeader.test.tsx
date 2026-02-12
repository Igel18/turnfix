/**
 * UnifiedPageHeader Component Tests
 * Tests for the unified page header template component
 */

import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../utils/test-utils';
import UnifiedPageHeader from '../../components/UnifiedPageHeader';
import { PlusCircle, Settings } from 'lucide-react';

describe('UnifiedPageHeader Component', () => {
  describe('Basic Rendering', () => {
    it('renders title correctly', () => {
      render(<UnifiedPageHeader title="Test Page" />);
      expect(screen.getByText('Test Page')).toBeInTheDocument();
    });

    it('renders with icon when provided', () => {
      const { container } = render(
        <UnifiedPageHeader title="Test Page" icon={Settings} />
      );
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('renders without icon when not provided', () => {
      const { container } = render(<UnifiedPageHeader title="Test Page" />);
      const icons = container.querySelectorAll('svg');
      expect(icons.length).toBe(0);
    });
  });

  describe('Action Button', () => {
    it('renders action button when provided', () => {
      render(
        <UnifiedPageHeader
          title="Test Page"
          actionLabel="Add New"
          onAction={vi.fn()}
        />
      );
      expect(screen.getByText('Add New')).toBeInTheDocument();
    });

    it('calls onAction when button clicked', async () => {
      const onAction = vi.fn();
      const user = userEvent.setup();
      
      render(
        <UnifiedPageHeader
          title="Test Page"
          actionLabel="Add New"
          onAction={onAction}
        />
      );
      
      const button = screen.getByText('Add New');
      await user.click(button);
      
      expect(onAction).toHaveBeenCalledTimes(1);
    });

    it('does not render action button when onAction not provided', () => {
      render(
        <UnifiedPageHeader
          title="Test Page"
          actionLabel="Add New"
        />
      );
      expect(screen.queryByText('Add New')).not.toBeInTheDocument();
    });

    it('renders action button with icon', () => {
      const { container } = render(
        <UnifiedPageHeader
          title="Test Page"
          actionLabel="Add New"
          actionIcon={PlusCircle}
          onAction={vi.fn()}
        />
      );
      const button = screen.getByText('Add New').closest('button');
      const icon = button?.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Breadcrumbs', () => {
    it('renders breadcrumbs when provided', () => {
      const breadcrumbs = [
        { label: 'Home', path: '/' },
        { label: 'Settings', path: '/settings' }
      ];
      
      render(
        <UnifiedPageHeader
          title="Test Page"
          breadcrumbs={breadcrumbs}
        />
      );
      
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('does not render breadcrumbs when not provided', () => {
      render(<UnifiedPageHeader title="Test Page" />);
      expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    });
  });

  describe('Children Content', () => {
    it('renders children when provided', () => {
      render(
        <UnifiedPageHeader title="Test Page">
          <div data-testid="custom-content">Custom Content</div>
        </UnifiedPageHeader>
      );
      
      expect(screen.getByTestId('custom-content')).toBeInTheDocument();
      expect(screen.getByText('Custom Content')).toBeInTheDocument();
    });

    it('renders without children', () => {
      const { container } = render(<UnifiedPageHeader title="Test Page" />);
      expect(container.querySelector('.children-wrapper')).not.toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('applies correct background styling', () => {
      const { container } = render(<UnifiedPageHeader title="Test Page" />);
      const header = container.firstChild;
      expect(header).toHaveClass('bg-white');
      expect(header).toHaveClass('shadow');
    });

    it('has proper spacing and layout', () => {
      const { container } = render(<UnifiedPageHeader title="Test Page" />);
      const header = container.firstChild;
      expect(header).toHaveClass('p-6');
      expect(header).toHaveClass('mb-6');
    });
  });

  describe('Accessibility', () => {
    it('has proper heading hierarchy', () => {
      render(<UnifiedPageHeader title="Test Page" />);
      const heading = screen.getByText('Test Page');
      expect(heading.tagName).toBe('H1');
    });

    it('action button is keyboard accessible', async () => {
      const onAction = vi.fn();
      const user = userEvent.setup();
      
      render(
        <UnifiedPageHeader
          title="Test Page"
          actionLabel="Add New"
          onAction={onAction}
        />
      );
      
      const button = screen.getByText('Add New');
      button.focus();
      await user.keyboard('{Enter}');
      
      expect(onAction).toHaveBeenCalledTimes(1);
    });
  });
});
