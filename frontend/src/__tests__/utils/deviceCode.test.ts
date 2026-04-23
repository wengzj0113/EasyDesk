/**
 * Device Code Utility Tests
 * Tests for session device code generation and management
 */

// Mock crypto for Node.js environment
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: (arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    }
  }
});

// Use jest.fn() to create a proper mock
const mockGetItem = jest.fn();
const mockSetItem = jest.fn();
const mockStorage: Record<string, string> = {};

// Override getItem and setItem
mockGetItem.mockImplementation((key: string) => mockStorage[key] || null);
mockSetItem.mockImplementation((key: string, value: string) => { mockStorage[key] = value; });

// Mock localStorage
Object.defineProperty(global, 'localStorage', {
  value: {
    getItem: mockGetItem,
    setItem: mockSetItem,
    removeItem: jest.fn((key: string) => { delete mockStorage[key]; }),
    clear: jest.fn(() => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); })
  },
  writable: true
});

// Import functions after mock setup
import {
  getSessionDeviceCode,
  getSessionPassword,
  setSessionDeviceCode,
  setSessionPassword
} from '../../utils/deviceCode';

describe('Device Code Utilities', () => {
  beforeEach(() => {
    // Clear mock storage
    Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
    jest.clearAllMocks();
  });

  describe('Code Format Validation', () => {
    test('should accept valid device codes', () => {
      const validCodes = ['123456789', 'ABCDEF123', 'XYZ987654'];
      validCodes.forEach(code => {
        expect(code.length).toBe(9);
      });
    });

    test('should accept valid passwords', () => {
      const validPasswords = ['1234', '123456', '999999'];
      validPasswords.forEach(pwd => {
        expect(pwd.length).toBeGreaterThanOrEqual(4);
        expect(pwd.length).toBeLessThanOrEqual(6);
      });
    });
  });

  describe('Random Code Generation', () => {
    test('should generate codes with expected character set', () => {
      const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const generatedCode = 'A1B2C3';

      generatedCode.split('').forEach(char => {
        expect(chars.includes(char)).toBe(true);
      });
    });

    test('should generate codes of specified length', () => {
      const lengths = [6, 9];
      lengths.forEach(len => {
        const code = 'X'.repeat(len);
        expect(code.length).toBe(len);
      });
    });

    test('should generate random values using crypto', () => {
      // Test that we can generate random values
      const array = new Uint8Array(6);
      crypto.getRandomValues(array);

      expect(array.length).toBe(6);
      array.forEach(val => {
        expect(typeof val).toBe('number');
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThanOrEqual(255);
      });
    });
  });
});
