# TurnFix Testing Infrastructure

## Overview
This document describes the comprehensive testing infrastructure created for the TurnFix gymnastics management system, including both dummy API server and UI testing capabilities.

## Test Infrastructure Components

### 1. API Dummy Server (`/api-dummy`)
A standalone Express.js server that provides realistic dummy data for testing purposes.

**Features:**
- Realistic data generators for all major entities
- Complete API endpoint coverage
- CORS enabled for cross-origin requests
- Request logging with Morgan
- Matches real API response formats

**Endpoints Provided:**
- `/api/participants` - Participant management
- `/api/disciplines` - Discipline data
- `/api/events` - Event information
- `/api/competitions` - Competition data
- `/api/clubs` - Club information
- `/api/results` - Result/scoring data

**Usage:**
```bash
# Start the dummy API server
cd api-dummy
npm install
npm start
# Server runs on http://localhost:3002
```

### 2. UI Test Suite (`/src/test`)
Comprehensive test coverage for all UI components and pages.

**Test Categories:**
- **Page Tests**: Complete page functionality testing
- **Component Tests**: Individual component testing  
- **Integration Tests**: End-to-end workflow testing
- **Utility Tests**: Helper function testing

**Test Framework:**
- **Vitest**: Fast test runner with ES modules support
- **React Testing Library**: Component testing utilities
- **JSDOM**: Browser environment simulation
- **MSW Alternative**: Custom fetch mocking

### 3. Test Utilities (`/src/test/utils/test-utils.tsx`)
Centralized testing utilities and mocks.

**Features:**
- **i18n Mocking**: Complete translation system mocking
- **API Mocking**: Realistic fetch mocking with proper responses
- **Data Generators**: Consistent mock data creation
- **Provider Wrapping**: Automatic React context wrapping
- **Query Client**: Pre-configured testing query client

## Available Test Scripts

```json
{
  "test": "vitest",
  "test:run": "vitest run",
  "test:coverage": "vitest run --coverage",
  "test:ui": "vitest --ui",
  "test:dummy": "cross-env VITE_API_BASE_URL=http://localhost:3002 vitest",
  "test:real": "cross-env VITE_API_BASE_URL=http://localhost:3001 vitest", 
  "test:integration": "vitest run src/test/integration",
  "test:pages": "vitest run src/test/pages",
  "test:components": "vitest run src/test/components"
}
```

## Testing Modes

### 1. Mock Mode (Default)
Tests run with completely mocked APIs and data.
```bash
npm test
```

### 2. Dummy API Mode  
Tests run against the dummy API server.
```bash
npm run test:dummy
```

### 3. Real API Mode
Tests run against the actual development API.
```bash
npm run test:real
```

## Mock Data Generators

The test infrastructure includes realistic data generators:

### Participants
```typescript
generateMockParticipants(count: number = 10)
```
- Realistic names and demographics
- Proper age calculations
- Club associations
- Gender distribution

### Disciplines
```typescript
generateMockDisciplines(count: number = 8)
```
- Gymnastics-specific disciplines
- Gender appropriateness
- Sort order and status
- Icon representations

### Events
```typescript
generateMockEvents(count: number = 5)
```
- Realistic event scheduling
- Venue information
- Status management
- Competition associations

## Example Test Structure

```typescript
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '../utils/test-utils';
import ComponentToTest from '../../components/ComponentToTest';

describe('ComponentToTest', () => {
  it('renders successfully', () => {
    render(<ComponentToTest />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('handles user interactions', async () => {
    const user = userEvent.setup();
    render(<ComponentToTest />);
    
    const button = screen.getByRole('button', { name: 'Click Me' });
    await user.click(button);
    
    expect(screen.getByText('Result Text')).toBeInTheDocument();
  });
});
```

## Test Coverage Areas

### Pages Tested
- ✅ Home Page (basic functionality)
- 🔄 Participants Page (in progress)
- 🔄 Events Page (in progress)  
- 🔄 Disciplines Page (in progress)
- 🔄 Results Page (in progress)

### Components Tested
- 🔄 UnifiedPageHeader (in progress)
- 🔄 Table Components (in progress)
- 🔄 Filter Components (in progress)
- 🔄 Pagination (in progress)

### Integration Tests
- 🔄 Complete user workflows
- 🔄 API integration scenarios
- 🔄 Error handling paths

## Running Tests

### Quick Start
```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test categories
npm run test:pages
npm run test:components
npm run test:integration
```

### With Dummy API
```bash
# Terminal 1: Start dummy API
cd api-dummy
npm start

# Terminal 2: Run tests against dummy API
npm run test:dummy
```

### Test UI Dashboard
```bash
# Open Vitest UI for interactive testing
npm run test:ui
```

## Status Summary

✅ **COMPLETED:**
- Test infrastructure setup
- Mock system implementation  
- Basic test utilities
- Home page testing working
- API dummy server created
- Test scripts configured
- Documentation created

🔄 **IN PROGRESS:**
- Complete page test coverage
- Component test implementation
- Integration test scenarios

📋 **TODO:**
- Error boundary testing
- Performance testing
- Accessibility testing
- Visual regression testing

## Troubleshooting

### Common Issues

1. **Import Path Errors**
   - Ensure test utils are imported from `../utils/test-utils`
   - Check relative path accuracy

2. **Mock Data Not Loading**
   - Verify fetch mocks are properly configured
   - Check API endpoint matching in mock functions

3. **Translation Keys Showing**
   - Ensure i18n mock is properly imported
   - Check translation key exists in mock translations

4. **Context Provider Errors**
   - Verify components are wrapped with proper providers
   - Check EventProvider mock implementation

### Debug Mode

Enable additional debugging information:
```bash
DEBUG=true npm test
```

## Contributing to Tests

When adding new tests:

1. **Use the standard test structure**
2. **Add proper describe/it blocks**  
3. **Include realistic test data**
4. **Test both success and error cases**
5. **Update this documentation**

## Performance Considerations

- Tests use mocked data for speed
- Query client is configured for testing (no retries)
- Components are tested in isolation when possible
- Integration tests are run separately for efficiency

## Next Steps

1. Complete page test coverage
2. Add comprehensive component tests
3. Implement integration test scenarios
4. Add error handling test coverage
5. Consider adding visual regression tests
6. Set up CI/CD test automation
