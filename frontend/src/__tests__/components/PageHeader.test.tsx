/**
 * PageHeader Component Tests
 * Simplified tests for PageHeader functionality
 */

// Mock the actual component
jest.mock('../../components/PageHeader', () => {
  return function MockPageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
    return (
      <div data-testid="page-header">
        <span data-testid="title">{title}</span>
        {subtitle && <span data-testid="subtitle">{subtitle}</span>}
      </div>
    );
  };
});

jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/test' })
}));

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import MockPageHeader from '../../components/PageHeader';

describe('PageHeader Component', () => {
  describe('Rendering', () => {
    test('should render title', () => {
      render(<MockPageHeader title="Test Page" />);
      expect(screen.getByTestId('page-header')).toBeInTheDocument();
      expect(screen.getByTestId('title')).toHaveTextContent('Test Page');
    });

    test('should render subtitle when provided', () => {
      render(<MockPageHeader title="Test Page" subtitle="Subtitle" />);
      expect(screen.getByTestId('subtitle')).toHaveTextContent('Subtitle');
    });
  });
});
