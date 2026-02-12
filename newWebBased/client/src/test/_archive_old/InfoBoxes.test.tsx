/**
 * InfoBoxes Component Tests
 * Tests for the contextual information box components
 */

import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '../utils/test-utils';
import { BlueInfoBox, YellowInfoBox, PinkInfoBox, RedInfoBox } from '../../components/InfoBoxes';

describe('InfoBoxes Components', () => {
  describe('BlueInfoBox', () => {
    it('renders with correct content', () => {
      render(
        <BlueInfoBox>
          <p>General information</p>
        </BlueInfoBox>
      );
      
      expect(screen.getByText('General information')).toBeInTheDocument();
    });

    it('has blue styling', () => {
      const { container } = render(
        <BlueInfoBox>Info</BlueInfoBox>
      );
      
      const box = container.firstChild;
      expect(box).toHaveClass('bg-blue-50');
      expect(box).toHaveClass('border-blue-200');
    });

    it('renders with title when provided', () => {
      render(
        <BlueInfoBox title="Information">
          <p>Content</p>
        </BlueInfoBox>
      );
      
      expect(screen.getByText('Information')).toBeInTheDocument();
    });

    it('renders without title', () => {
      render(
        <BlueInfoBox>
          <p>Content</p>
        </BlueInfoBox>
      );
      
      expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    });

    it('renders icon when provided', () => {
      const { container } = render(
        <BlueInfoBox icon={<span data-testid="icon">ℹ️</span>}>
          Content
        </BlueInfoBox>
      );
      
      expect(screen.getByTestId('icon')).toBeInTheDocument();
    });
  });

  describe('YellowInfoBox', () => {
    it('renders with correct content', () => {
      render(
        <YellowInfoBox>
          <p>Workflow guidance</p>
        </YellowInfoBox>
      );
      
      expect(screen.getByText('Workflow guidance')).toBeInTheDocument();
    });

    it('has yellow/amber styling', () => {
      const { container } = render(
        <YellowInfoBox>Warning</YellowInfoBox>
      );
      
      const box = container.firstChild;
      expect(box).toHaveClass('bg-yellow-50');
      expect(box).toHaveClass('border-yellow-200');
    });

    it('renders multiple paragraphs', () => {
      render(
        <YellowInfoBox>
          <p>Step 1: Do this</p>
          <p>Step 2: Do that</p>
        </YellowInfoBox>
      );
      
      expect(screen.getByText('Step 1: Do this')).toBeInTheDocument();
      expect(screen.getByText('Step 2: Do that')).toBeInTheDocument();
    });
  });

  describe('PinkInfoBox', () => {
    it('renders with correct content', () => {
      render(
        <PinkInfoBox>
          <p>Caution message</p>
        </PinkInfoBox>
      );
      
      expect(screen.getByText('Caution message')).toBeInTheDocument();
    });

    it('has pink/rose styling', () => {
      const { container } = render(
        <PinkInfoBox>Caution</PinkInfoBox>
      );
      
      const box = container.firstChild;
      expect(box).toHaveClass('bg-pink-50');
      expect(box).toHaveClass('border-pink-200');
    });

    it('renders with title', () => {
      render(
        <PinkInfoBox title="Caution">
          <p>Be careful</p>
        </PinkInfoBox>
      );
      
      expect(screen.getByText('Caution')).toBeInTheDocument();
      expect(screen.getByText('Be careful')).toBeInTheDocument();
    });
  });

  describe('RedInfoBox', () => {
    it('renders with correct content', () => {
      render(
        <RedInfoBox>
          <p>Critical error</p>
        </RedInfoBox>
      );
      
      expect(screen.getByText('Critical error')).toBeInTheDocument();
    });

    it('has red styling', () => {
      const { container } = render(
        <RedInfoBox>Error</RedInfoBox>
      );
      
      const box = container.firstChild;
      expect(box).toHaveClass('bg-red-50');
      expect(box).toHaveClass('border-red-200');
    });

    it('renders error title', () => {
      render(
        <RedInfoBox title="Error">
          <p>Something went wrong</p>
        </RedInfoBox>
      );
      
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
  });

  describe('Common Functionality', () => {
    it('all boxes support custom className', () => {
      const { container: blue } = render(
        <BlueInfoBox className="custom-class">Content</BlueInfoBox>
      );
      expect(blue.firstChild).toHaveClass('custom-class');

      const { container: yellow } = render(
        <YellowInfoBox className="custom-class">Content</YellowInfoBox>
      );
      expect(yellow.firstChild).toHaveClass('custom-class');

      const { container: pink } = render(
        <PinkInfoBox className="custom-class">Content</PinkInfoBox>
      );
      expect(pink.firstChild).toHaveClass('custom-class');

      const { container: red } = render(
        <RedInfoBox className="custom-class">Content</RedInfoBox>
      );
      expect(red.firstChild).toHaveClass('custom-class');
    });

    it('all boxes render rich content', () => {
      const content = (
        <div>
          <h3>Title</h3>
          <ul>
            <li>Item 1</li>
            <li>Item 2</li>
          </ul>
        </div>
      );

      render(<BlueInfoBox>{content}</BlueInfoBox>);
      expect(screen.getByText('Title')).toBeInTheDocument();
      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });

    it('all boxes have consistent border and padding', () => {
      const { container: blue } = render(<BlueInfoBox>Content</BlueInfoBox>);
      expect(blue.firstChild).toHaveClass('border');
      expect(blue.firstChild).toHaveClass('rounded-lg');
      expect(blue.firstChild).toHaveClass('p-4');

      const { container: red } = render(<RedInfoBox>Content</RedInfoBox>);
      expect(red.firstChild).toHaveClass('border');
      expect(red.firstChild).toHaveClass('rounded-lg');
      expect(red.firstChild).toHaveClass('p-4');
    });
  });
});
