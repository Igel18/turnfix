/**
 * UnifiedDialog Component Tests
 * Tests for the unified modal dialog component
 */

import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../utils/test-utils';
import UnifiedDialog from '../../components/UnifiedDialog';

describe('UnifiedDialog Component', () => {
  describe('Visibility', () => {
    it('renders when open is true', () => {
      render(
        <UnifiedDialog
          open={true}
          onClose={vi.fn()}
          title="Test Dialog"
        >
          <div>Dialog Content</div>
        </UnifiedDialog>
      );
      
      expect(screen.getByText('Test Dialog')).toBeInTheDocument();
      expect(screen.getByText('Dialog Content')).toBeInTheDocument();
    });

    it('does not render when open is false', () => {
      render(
        <UnifiedDialog
          open={false}
          onClose={vi.fn()}
          title="Test Dialog"
        >
          <div>Dialog Content</div>
        </UnifiedDialog>
      );
      
      expect(screen.queryByText('Test Dialog')).not.toBeInTheDocument();
    });
  });

  describe('Title and Icon', () => {
    it('renders title correctly', () => {
      render(
        <UnifiedDialog
          open={true}
          onClose={vi.fn()}
          title="Test Dialog"
        >
          Content
        </UnifiedDialog>
      );
      
      expect(screen.getByText('Test Dialog')).toBeInTheDocument();
    });

    it('renders with icon when provided', () => {
      const MockIcon = () => <svg data-testid="test-icon" />;
      
      render(
        <UnifiedDialog
          open={true}
          onClose={vi.fn()}
          title="Test Dialog"
          icon={MockIcon}
        >
          Content
        </UnifiedDialog>
      );
      
      expect(screen.getByTestId('test-icon')).toBeInTheDocument();
    });
  });

  describe('Close Functionality', () => {
    it('calls onClose when close button clicked', async () => {
      const onClose = vi.fn();
      const user = userEvent.setup();
      
      render(
        <UnifiedDialog
          open={true}
          onClose={onClose}
          title="Test Dialog"
        >
          Content
        </UnifiedDialog>
      );
      
      const closeButton = screen.getByLabelText(/close/i);
      await user.click(closeButton);
      
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when clicking outside (if closeOnOutsideClick is true)', async () => {
      const onClose = vi.fn();
      const user = userEvent.setup();
      
      render(
        <UnifiedDialog
          open={true}
          onClose={onClose}
          title="Test Dialog"
          closeOnOutsideClick={true}
        >
          Content
        </UnifiedDialog>
      );
      
      const backdrop = screen.getByRole('dialog').parentElement;
      if (backdrop) {
        await user.click(backdrop);
        expect(onClose).toHaveBeenCalled();
      }
    });

    it('does not close on outside click when closeOnOutsideClick is false', async () => {
      const onClose = vi.fn();
      const user = userEvent.setup();
      
      render(
        <UnifiedDialog
          open={true}
          onClose={onClose}
          title="Test Dialog"
          closeOnOutsideClick={false}
        >
          Content
        </UnifiedDialog>
      );
      
      const backdrop = screen.getByRole('dialog').parentElement;
      if (backdrop) {
        await user.click(backdrop);
        expect(onClose).not.toHaveBeenCalled();
      }
    });
  });

  describe('Footer Actions', () => {
    it('renders save button when onSave provided', () => {
      render(
        <UnifiedDialog
          open={true}
          onClose={vi.fn()}
          onSave={vi.fn()}
          title="Test Dialog"
        >
          Content
        </UnifiedDialog>
      );
      
      expect(screen.getByText(/save/i)).toBeInTheDocument();
    });

    it('calls onSave when save button clicked', async () => {
      const onSave = vi.fn();
      const user = userEvent.setup();
      
      render(
        <UnifiedDialog
          open={true}
          onClose={vi.fn()}
          onSave={onSave}
          title="Test Dialog"
        >
          Content
        </UnifiedDialog>
      );
      
      const saveButton = screen.getByText(/save/i);
      await user.click(saveButton);
      
      expect(onSave).toHaveBeenCalledTimes(1);
    });

    it('disables save button when saving', () => {
      render(
        <UnifiedDialog
          open={true}
          onClose={vi.fn()}
          onSave={vi.fn()}
          saving={true}
          title="Test Dialog"
        >
          Content
        </UnifiedDialog>
      );
      
      const saveButton = screen.getByText(/saving/i);
      expect(saveButton).toBeDisabled();
    });

    it('renders custom footer when provided', () => {
      render(
        <UnifiedDialog
          open={true}
          onClose={vi.fn()}
          title="Test Dialog"
          footer={<button>Custom Action</button>}
        >
          Content
        </UnifiedDialog>
      );
      
      expect(screen.getByText('Custom Action')).toBeInTheDocument();
    });
  });

  describe('Size Variants', () => {
    it('renders small size correctly', () => {
      const { container } = render(
        <UnifiedDialog
          open={true}
          onClose={vi.fn()}
          title="Test Dialog"
          size="sm"
        >
          Content
        </UnifiedDialog>
      );
      
      const dialog = container.querySelector('[class*="max-w"]');
      expect(dialog).toHaveClass('max-w-md');
    });

    it('renders large size correctly', () => {
      const { container } = render(
        <UnifiedDialog
          open={true}
          onClose={vi.fn()}
          title="Test Dialog"
          size="lg"
        >
          Content
        </UnifiedDialog>
      );
      
      const dialog = container.querySelector('[class*="max-w"]');
      expect(dialog).toHaveClass('max-w-4xl');
    });

    it('renders full width correctly', () => {
      const { container } = render(
        <UnifiedDialog
          open={true}
          onClose={vi.fn()}
          title="Test Dialog"
          size="full"
        >
          Content
        </UnifiedDialog>
      );
      
      const dialog = container.querySelector('[class*="max-w"]');
      expect(dialog).toHaveClass('max-w-7xl');
    });
  });

  describe('Content Rendering', () => {
    it('renders children content', () => {
      render(
        <UnifiedDialog
          open={true}
          onClose={vi.fn()}
          title="Test Dialog"
        >
          <div data-testid="custom-content">Custom Content</div>
        </UnifiedDialog>
      );
      
      expect(screen.getByTestId('custom-content')).toBeInTheDocument();
    });

    it('renders complex nested content', () => {
      render(
        <UnifiedDialog
          open={true}
          onClose={vi.fn()}
          title="Test Dialog"
        >
          <div>
            <input type="text" placeholder="Name" />
            <select>
              <option>Option 1</option>
            </select>
            <button>Action</button>
          </div>
        </UnifiedDialog>
      );
      
      expect(screen.getByPlaceholderText('Name')).toBeInTheDocument();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
      expect(screen.getByText('Action')).toBeInTheDocument();
    });
  });
});
