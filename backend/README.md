# Group Chat AI Backend

The backend service for Group Chat AI, an AI-powered presentation practice platform.

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- npm 8+

### Installation
```bash
npm install
```

### Environment Setup
```bash
cp .env.example .env
# Edit .env with your configuration
```

### Development
```bash
npm run dev
```

### Testing
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Building
```bash
npm run build
```

## 🧪 Testing

This project uses Jest with TypeScript for comprehensive testing.

### Test Structure
```
src/__tests__/
├── controllers/     # Controller unit tests
├── services/        # Service unit tests
├── middleware/      # Middleware unit tests
├── utils/          # Utility function tests
├── websocket/      # WebSocket tests
├── mocks/          # Test mocks and fixtures
├── setup.ts        # Test setup configuration
├── globalSetup.ts  # Global test setup
└── globalTeardown.ts # Global test cleanup
```

### Writing Tests

#### Unit Tests
Create test files with `.test.ts` extension:

```typescript
import { MyService } from '../services/MyService';

describe('MyService', () => {
  let service: MyService;

  beforeEach(() => {
    service = new MyService();
  });

  it('should perform expected behavior', () => {
    const result = service.doSomething();
    expect(result).toBeDefined();
  });
});
```

#### Mocking
Use the provided mocks in `src/__tests__/mocks/`:

```typescript
import { mockRequest, mockResponse, mockLogger } from '../mocks';

// Mock Express request/response
const req = mockRequest({ body: { test: 'data' } });
const res = mockResponse();

// Mock logger is automatically available in tests
```

### Coverage
The project maintains high test coverage. Run coverage reports with:

```bash
npm run test:coverage
```

View detailed coverage reports in `coverage/lcov-report/index.html`.

### CI/CD
Tests run automatically in CI/CD pipelines. Ensure all tests pass before merging.

## 📁 Project Structure

```
src/
├── controllers/     # API route handlers
├── services/        # Business logic services
├── middleware/      # Express middleware
├── utils/          # Utility functions
├── websocket/      # WebSocket handling
├── config/         # Configuration files
└── __tests__/      # Test files
```

## 🔧 Configuration

### Environment Variables
See `.env.example` for all available configuration options.

### Test Configuration
Jest configuration is in `jest.config.js`. Key settings:
- TypeScript support via ts-jest
- Coverage collection from all source files
- Global setup/teardown for test environment
- Mock configurations for external dependencies

## 🚢 Deployment

### Docker
```bash
npm run docker:build
npm run docker:run
```

### AWS
```bash
npm run build
# Deploy using CDK in infrastructure package
```

## 🤝 Contributing

1. Write tests for new functionality
2. Ensure all existing tests pass
3. Maintain test coverage above 80%
4. Follow existing code patterns
5. Update documentation as needed

## 📊 Quality Standards

- **Test Coverage**: Minimum 80%
- **Code Quality**: ESLint compliance
- **Type Safety**: TypeScript strict mode
- **Performance**: Sub-3s response times
- **Security**: Input validation and sanitization