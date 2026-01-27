// Test setup file for Vitest
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test
afterEach(() => {
    cleanup();
});

// Add custom matchers if needed in the future
// expect.extend({...});
