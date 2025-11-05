# TurnFix UI Testing Suite

This comprehensive testing suite provides both API dummy server and complete UI tests for the TurnFix gymnastics management system.

## Overview

The testing suite includes:
- **API Dummy Server**: Provides consistent test data for reliable UI testing
- **UI Component Tests**: Unit tests for individual React components
- **Page Tests**: Integration tests for complete page functionality
- **Integration Tests**: End-to-end workflow testing
- **Test Utilities**: Shared helpers and mock data generators

## Quick Start

### 1. Install Dependencies

```bash
# Install API dummy dependencies
cd api-dummy
npm install

# Install client dependencies (if not already done)
cd ../client
npm install
```

### 2. Run Tests

```bash
# Run all tests against dummy API (recommended for development)
npm run test:dummy

# Run all tests against real API (requires API server running)
npm run test:real

# Run specific test suites
npm run test:components    # Component tests only
npm run test:pages        # Page tests only
npm run test:integration  # Integration tests only

# Run tests in watch mode for development
npm run test

# Run tests with UI interface
npm run test:ui

# Generate coverage report
npm run test:coverage
```

## API Dummy Server

### Purpose
The dummy API server provides:
- Consistent test data across test runs
- Fast response times for reliable testing
- No dependency on external database
- Isolated testing environment

### Endpoints
The dummy server implements all major API endpoints:

- **GET /api/disciplines** - List disciplines with icons
- **GET /api/associations** - List associations  
- **GET /api/regions** - List regions
- **GET /api/clubs** - List clubs with location data
- **GET /api/participants** - List participants with demographics
- **GET /api/events** - List events with dates and locations
- **GET /api/competitions** - List competitions with categories
- **GET /api/competitions/:id/disciplines** - Disciplines for competition
- **GET /api/events/:eventId/ranking** - Competition results and rankings
- **POST/PUT/DELETE** - CRUD operations for all entities

### Data Generation
- Realistic dummy data with proper relationships
- Configurable data volumes via query parameters
- Consistent IDs and references across entities
- Realistic score distributions and rankings

## Test Structure

### Component Tests (`src/test/components/`)
Unit tests for individual React components:
- Props validation
- Event handling
- Rendering logic
- Accessibility features

### Page Tests (`src/test/pages/`)
Integration tests for complete page functionality:
- Data loading and display
- User interactions
- Form handling
- Navigation

### Integration Tests (`src/test/integration/`)
End-to-end workflow testing:
- Complete user journeys
- Cross-page functionality
- Data consistency
- Performance testing

### Test Utilities (`src/test/utils/`)
Shared testing infrastructure:
- Mock data generators
- API response helpers
- Custom render functions
- Common test setup

## Testing Patterns

### Mock Data Generation
```typescript
import { generateTestParticipant, generateTestEvent } from '../utils/test-utils';

const participant = generateTestParticipant(1);
const event = generateTestEvent(42);
```

### API Mocking
```typescript
import { mockFetch, mockApiResponse } from '../utils/test-utils';

mockFetch.mockResolvedValueOnce(mockApiResponse([participant1, participant2]));
```

### Component Testing
```typescript
import { render, screen, waitFor } from '../utils/test-utils';

render(<ParticipantsUnified />);
await waitFor(() => {
  expect(screen.getByText('TestFirstname1 TestLastname1')).toBeInTheDocument();
});
```

## Coverage Goals

### Component Coverage
- [ ] UnifiedPageHeader ✅
- [ ] Navigation components
- [ ] Form components
- [ ] Table components
- [ ] Filter components

### Page Coverage  
- [x] Home ✅
- [x] Events ✅
- [x] Participants ✅
- [x] Disciplines ✅
- [x] Results ✅
- [ ] Associations
- [ ] Regions
- [ ] Clubs

### Integration Coverage
- [x] Navigation flows ✅
- [x] CRUD workflows ✅
- [x] Search and filtering ✅
- [x] PDF export ✅
- [x] Responsive design ✅
- [x] Error handling ✅

## Test Configuration

### Vitest Configuration (`vitest.config.ts`)
```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/test/', '**/*.d.ts'],
    },
  },
});
```

### Environment Variables
- `VITE_API_URL`: API base URL for tests
- `TEST_MODE`: 'dummy' or 'real' to indicate test mode

## Best Practices

### Writing Tests
1. **Use descriptive test names** that explain what is being tested
2. **Mock external dependencies** for consistent results
3. **Test user interactions** not implementation details
4. **Use realistic test data** that matches production scenarios
5. **Test error states** and edge cases

### Test Organization
1. **Group related tests** in describe blocks
2. **Use beforeEach** for common setup
3. **Clean up mocks** between tests
4. **Follow AAA pattern**: Arrange, Act, Assert

### Performance
1. **Prefer unit tests** over integration tests for speed
2. **Mock heavy operations** like API calls
3. **Use test-specific data** to avoid interference
4. **Run tests in parallel** when possible

## Debugging Tests

### Common Issues
1. **Test timeouts**: Increase timeout or check for infinite loops
2. **Element not found**: Use `waitFor` for async operations
3. **Mock not working**: Verify mock setup and call order
4. **Memory leaks**: Clean up subscriptions and timers

### Debug Tools
```bash
# Run specific test file
npm run test -- Results.test.tsx

# Run with verbose output
npm run test -- --reporter=verbose

# Debug with browser
npm run test:ui
```

## Continuous Integration

### GitHub Actions Integration
Tests run automatically on:
- Pull requests
- Push to main branches
- Release builds

### Coverage Requirements
- Minimum 80% code coverage
- All critical paths tested
- Error handling validated

## Contributing

### Adding New Tests
1. Create test files following naming convention: `ComponentName.test.tsx`
2. Import necessary utilities from `test-utils`
3. Follow existing patterns for consistency
4. Add appropriate describe blocks and test cases

### Updating Mock Data
1. Modify generators in `test-utils.tsx`
2. Ensure backwards compatibility
3. Update related tests if needed

### API Changes
1. Update dummy server endpoints
2. Modify API mocks as needed
3. Verify all affected tests pass

## Troubleshooting

### Common Solutions
```bash
# Clear test cache
npx vitest run --no-cache

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Reset test environment
npm run test:dummy -- --run --force-exit
```

### Getting Help
- Check test output for specific error messages
- Use `console.log` in tests for debugging
- Run tests in isolation to identify issues
- Verify mock setup matches actual API contracts
