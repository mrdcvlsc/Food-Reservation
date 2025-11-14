// src/pages/student/Dashboard.test.js
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from './Dashboard';
import { api } from '../../lib/api';

// Mock the API module
jest.mock('../../lib/api', () => ({
  api: {
    get: jest.fn(),
  },
  ApiError: class ApiError extends Error {
    constructor(message, status) {
      super(message);
      this.status = status;
    }
    static Maintenance = 503;
    static NotFound = 404;
    static ServerError = 500;
    static Unauthorized = 401;
    static Forbidden = 403;
  },
}));

// Mock auth module
jest.mock('../../lib/auth', () => ({
  refreshSessionForProtected: jest.fn().mockResolvedValue(undefined),
}));

// Mock components
jest.mock('../../components/avbar', () => {
  return function MockNavbar() {
    return <div data-testid="navbar">Navbar</div>;
  };
});

describe('Dashboard Loading States', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Setup localStorage mock
    const mockUser = { id: '1', name: 'Test Student', balance: 100 };
    localStorage.setItem('user', JSON.stringify(mockUser));
    localStorage.setItem('token', 'mock-token');
  });

  afterEach(() => {
    localStorage.clear();
  });

  test('renders skeleton placeholders while loading', async () => {
    // Mock API to delay response
    api.get.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve([]), 100))
    );

    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    // Check that loading skeletons are present
    const skeletonElements = screen.getAllByRole('status');
    expect(skeletonElements.length).toBeGreaterThan(0);

    // Verify accessibility attributes
    const walletSkeleton = screen.getByLabelText('Loading wallet');
    expect(walletSkeleton).toBeInTheDocument();

    const activitySkeleton = screen.getByLabelText('Loading recent activity');
    expect(activitySkeleton).toBeInTheDocument();

    // Wait for loading to complete
    await waitFor(() => {
      expect(api.get).toHaveBeenCalled();
    });
  });

  test('shows actual content after loading completes', async () => {
    // Mock successful API responses
    api.get.mockImplementation((path) => {
      if (path === '/reservations/mine') {
        return Promise.resolve([
          {
            id: 'RES-1',
            title: 'Test Order',
            total: 50,
            createdAt: new Date().toISOString(),
            status: 'Approved',
            items: []
          }
        ]);
      }
      if (path === '/transactions/mine') {
        return Promise.resolve([]);
      }
      if (path === '/wallets/me') {
        return Promise.resolve({ id: '1', balance: 100 });
      }
      return Promise.resolve([]);
    });

    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    // Wait for content to load
    await waitFor(() => {
      expect(screen.queryByLabelText('Loading wallet')).not.toBeInTheDocument();
    });

    // Verify actual content is displayed
    expect(screen.getByText(/Wallet:/)).toBeInTheDocument();
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
  });

  test('displays error banner when data load fails', async () => {
    // Mock API to reject
    const errorMessage = 'Network error';
    api.get.mockRejectedValue(new Error(errorMessage));

    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    // Verify error message and retry button
    expect(screen.getByText('Error Loading Dashboard')).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  test('skeleton has correct accessibility attributes', async () => {
    api.get.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve([]), 100))
    );

    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    // Check for role="status" and aria-live="polite"
    const statusElements = screen.getAllByRole('status');
    statusElements.forEach(element => {
      expect(element).toHaveAttribute('aria-live', 'polite');
    });
  });
});
