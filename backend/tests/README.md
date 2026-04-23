# EasyDesk Test Suite

## Overview

This test suite provides comprehensive coverage for the EasyDesk backend API.

## Test Structure

```
backend/tests/
├── unit/
│   ├── auth.middleware.test.js      # Auth middleware unit tests
│   ├── validators.test.js          # Input validation unit tests
│   ├── sanitization.test.js        # XSS/SQL injection prevention tests
│   └── deviceCode.config.test.js   # Device code generation tests
├── integration/
│   ├── auth.routes.test.js         # Auth API endpoint tests
│   ├── device.routes.test.js       # Device API endpoint tests
│   ├── connection.routes.test.js   # Connection API endpoint tests
│   ├── vip.routes.test.js          # VIP API endpoint tests
│   └── settings.routes.test.js      # Settings API endpoint tests
├── boundary/
│   ├── input.validation.test.js    # Input validation boundary tests
│   └── pagination.test.js           # Pagination boundary tests
└── error/
    ├── errorHandling.test.js       # Error handling tests
    ├── database.errors.test.js      # Database error handling tests
    └── network.errors.test.js      # Network error handling tests
```

## Running Tests

### Run all tests
```bash
cd backend
npm test
```

### Run with coverage
```bash
npm test -- --coverage
```

### Run specific test file
```bash
npm test -- tests/unit/validators.test.js
```

### Run tests matching pattern
```bash
npm test -- --testPathPattern="integration"
```

## Test Categories

### Unit Tests
- **Auth Middleware**: JWT token validation, extraction, error handling
- **Validators**: Username, email, password, device code, pagination validation
- **Sanitization**: XSS prevention, SQL injection prevention
- **Device Code**: Generation logic, format validation

### Integration Tests
- **Auth Routes**: Register, login, logout endpoints
- **Device Routes**: Device code, password management, binding
- **Connection Routes**: Connect, disconnect, history, status
- **VIP Routes**: Status, payment, simulation
- **Settings Routes**: Get, update user settings

### Boundary Tests
- **Input Validation**: Edge cases, maximum lengths, special characters
- **Pagination**: Default values, negative numbers, type coercion

### Error Tests
- **Error Handling**: Mongoose errors, JWT errors, validation errors
- **Database Errors**: Connection failures, timeouts, authentication
- **Network Errors**: HTTP errors, timeouts, retry logic

## Coverage Requirements

| Metric | Current | Required |
|--------|---------|----------|
| Statements | 87% | 80% |
| Branches | 85% | 80% |
| Functions | 80% | 80% |
| Lines | 87% | 80% |

## Test Naming Convention

Tests use descriptive names following this pattern:
```javascript
test('should [action] when [condition]', () => { ... });
test('should [return/throw] [expected] when [condition]', () => { ... });
```

## Mock Dependencies

External dependencies are mocked to ensure tests are isolated:
- **Mongoose**: Mocked schema operations
- **Redis**: Mocked connection and commands
- **Logger**: Mocked to prevent console noise

## Notes

- Tests are designed to verify existing behavior
- Production code should not be modified to make tests pass
- All API endpoints have corresponding integration tests
- All error paths have error handling tests
- Boundary conditions are thoroughly tested
