// Test environment setup
import * as chai from 'chai';
import * as sinon from 'sinon';

// Configure chai
chai.should();

// Global test setup
beforeEach(() => {
  // Reset all stubs before each test
  sinon.restore();
});

// Global test teardown
afterEach(() => {
  // Clean up any remaining stubs
  sinon.restore();
});

// Export common testing utilities
export { chai, sinon };
export const { expect } = chai;
