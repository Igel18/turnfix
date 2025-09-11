import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { render, setupCommonMocks } from '../utils/test-utils';
import Home from '../../pages/Home';

describe('Home Page', () => {
  beforeEach(() => {
    setupCommonMocks();
  });

  it('renders the home page component', () => {
    render(<Home />);
    
    // Just check that the component renders without crashing
    // This is a basic smoke test
    expect(document.body).toBeInTheDocument();
  });

  it('displays welcome message', () => {
    render(<Home />);
    
    // Look for the main welcome heading
    expect(screen.getByText('Welcome to TurnFix')).toBeInTheDocument();
  });

  it('displays navigation buttons', () => {
    render(<Home />);
    
    // Check for main action buttons
    expect(screen.getByText('Enter Dashboard')).toBeInTheDocument();
    expect(screen.getByText('View Events')).toBeInTheDocument();
    expect(screen.getByText('Database Config')).toBeInTheDocument();
  });

  it('displays feature sections', () => {
    render(<Home />);
    
    // Check for feature headings
    expect(screen.getByText('Competition Management')).toBeInTheDocument();
    expect(screen.getByText('Real-time Scoring')).toBeInTheDocument();
    expect(screen.getByText('Club Management')).toBeInTheDocument();
  });

  it('displays description text', () => {
    render(<Home />);
    
    // Check for description
    expect(screen.getByText('Comprehensive gymnastics competition management system')).toBeInTheDocument();
    expect(screen.getByText('Login required for full access')).toBeInTheDocument();
  });
});
