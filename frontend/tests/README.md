# SAMANVAY Frontend Test Suite

Frontend test files are executed with Vitest and React Testing Library (`@testing-library/react`).

### Test Execution
```bash
# Run all frontend tests
npm --prefix frontend test -- --run

# Run in watch mode
npm --prefix frontend test
```

### Organization
- [`frontend/src/test/components.test.jsx`](file:///c:/SAMANVAY/frontend/src/test/components.test.jsx): Unit and component validation test suite covering form validation, SLA badges, role badges, notifications, and overview rendering.
- [`frontend/src/test/setup.js`](file:///c:/SAMANVAY/frontend/src/test/setup.js): JSDOM environment setup and mock extensions.
