/**
 * Validator Middleware Unit Tests
 * Tests for input validation functions
 */

const {
  validateUsername,
  validateEmail,
  validatePassword,
  validateDeviceCode,
  validateConnectionPassword,
  validateObjectId,
  sanitizeString,
  validatePagination
} = require('../../../src/middleware/validator');

describe('Validator Middleware', () => {
  describe('validateUsername', () => {
    test('should accept valid username', () => {
      const result = validateUsername('testuser');
      expect(result.valid).toBe(true);
    });

    test('should accept username with underscore', () => {
      const result = validateUsername('test_user');
      expect(result.valid).toBe(true);
    });

    test('should accept username with numbers', () => {
      const result = validateUsername('user123');
      expect(result.valid).toBe(true);
    });

    test('should reject empty username', () => {
      const result = validateUsername('');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should reject null username', () => {
      const result = validateUsername(null);
      expect(result.valid).toBe(false);
    });

    test('should reject undefined username', () => {
      const result = validateUsername(undefined);
      expect(result.valid).toBe(false);
    });

    test('should reject username shorter than 3 characters', () => {
      const result = validateUsername('ab');
      expect(result.valid).toBe(false);
    });

    test('should reject username longer than 20 characters', () => {
      const result = validateUsername('a'.repeat(21));
      expect(result.valid).toBe(false);
    });

    test('should reject username with special characters', () => {
      const result = validateUsername('test@user');
      expect(result.valid).toBe(false);
    });

    test('should reject username with spaces', () => {
      const result = validateUsername('test user');
      expect(result.valid).toBe(false);
    });

    test('should reject username with hyphen', () => {
      const result = validateUsername('test-user');
      expect(result.valid).toBe(false);
    });

    test('should reject non-string input', () => {
      expect(validateUsername(123).valid).toBe(false);
      expect(validateUsername({}).valid).toBe(false);
      expect(validateUsername([]).valid).toBe(false);
    });
  });

  describe('validateEmail', () => {
    test('should accept valid email', () => {
      const result = validateEmail('test@example.com');
      expect(result.valid).toBe(true);
    });

    test('should accept email with subdomain', () => {
      const result = validateEmail('test@mail.example.com');
      expect(result.valid).toBe(true);
    });

    test('should accept email with plus sign', () => {
      const result = validateEmail('test+tag@example.com');
      expect(result.valid).toBe(true);
    });

    test('should reject empty email', () => {
      const result = validateEmail('');
      expect(result.valid).toBe(false);
    });

    test('should reject null email', () => {
      const result = validateEmail(null);
      expect(result.valid).toBe(false);
    });

    test('should reject invalid email format', () => {
      const result = validateEmail('invalid-email');
      expect(result.valid).toBe(false);
    });

    test('should reject email without domain', () => {
      const result = validateEmail('test@');
      expect(result.valid).toBe(false);
    });

    test('should reject email without @', () => {
      const result = validateEmail('testexample.com');
      expect(result.valid).toBe(false);
    });

    test('should reject email without local part', () => {
      const result = validateEmail('@example.com');
      expect(result.valid).toBe(false);
    });

    test('should reject email longer than 100 characters', () => {
      const result = validateEmail('a'.repeat(89) + '@example.com');
      expect(result.valid).toBe(false);
    });

    test('should reject non-string input', () => {
      expect(validateEmail(123).valid).toBe(false);
      expect(validateEmail(true).valid).toBe(false);
    });
  });

  describe('validatePassword', () => {
    test('should accept valid password', () => {
      const result = validatePassword('password123');
      expect(result.valid).toBe(true);
    });

    test('should accept minimum length password', () => {
      const result = validatePassword('123456');
      expect(result.valid).toBe(true);
    });

    test('should accept maximum length password', () => {
      const result = validatePassword('a'.repeat(128));
      expect(result.valid).toBe(true);
    });

    test('should reject empty password', () => {
      const result = validatePassword('');
      expect(result.valid).toBe(false);
    });

    test('should reject null password', () => {
      const result = validatePassword(null);
      expect(result.valid).toBe(false);
    });

    test('should reject password shorter than 6 characters', () => {
      const result = validatePassword('12345');
      expect(result.valid).toBe(false);
    });

    test('should reject password longer than 128 characters', () => {
      const result = validatePassword('a'.repeat(129));
      expect(result.valid).toBe(false);
    });

    test('should reject non-string input', () => {
      expect(validatePassword(123).valid).toBe(false);
      expect(validatePassword([]).valid).toBe(false);
    });
  });

  describe('validateDeviceCode', () => {
    test('should accept valid 9-digit device code', () => {
      const result = validateDeviceCode('123456789');
      expect(result.valid).toBe(true);
    });

    test('should normalize device code to uppercase', () => {
      const result = validateDeviceCode('123456789');
      expect(result.normalized).toBe('123456789');
    });

    test('should reject device code with letters', () => {
      const result = validateDeviceCode('12345678A');
      expect(result.valid).toBe(false);
    });

    test('should reject device code shorter than 9 digits', () => {
      const result = validateDeviceCode('12345678');
      expect(result.valid).toBe(false);
    });

    test('should reject device code longer than 9 digits', () => {
      const result = validateDeviceCode('1234567890');
      expect(result.valid).toBe(false);
    });

    test('should reject empty device code', () => {
      const result = validateDeviceCode('');
      expect(result.valid).toBe(false);
    });

    test('should reject null device code', () => {
      const result = validateDeviceCode(null);
      expect(result.valid).toBe(false);
    });

    test('should reject device code with special characters', () => {
      const result = validateDeviceCode('12345678!');
      expect(result.valid).toBe(false);
    });

    test('should reject non-string input', () => {
      expect(validateDeviceCode(123456789).valid).toBe(false);
    });
  });

  describe('validateConnectionPassword', () => {
    test('should accept 4-digit password', () => {
      const result = validateConnectionPassword('1234');
      expect(result.valid).toBe(true);
    });

    test('should accept 5-digit password', () => {
      const result = validateConnectionPassword('12345');
      expect(result.valid).toBe(true);
    });

    test('should accept 6-digit password', () => {
      const result = validateConnectionPassword('123456');
      expect(result.valid).toBe(true);
    });

    test('should reject 3-digit password', () => {
      const result = validateConnectionPassword('123');
      expect(result.valid).toBe(false);
    });

    test('should reject 7-digit password', () => {
      const result = validateConnectionPassword('1234567');
      expect(result.valid).toBe(false);
    });

    test('should reject password with letters', () => {
      const result = validateConnectionPassword('1234a');
      expect(result.valid).toBe(false);
    });

    test('should reject empty password', () => {
      const result = validateConnectionPassword('');
      expect(result.valid).toBe(false);
    });

    test('should reject null password', () => {
      const result = validateConnectionPassword(null);
      expect(result.valid).toBe(false);
    });

    test('should accept all zeros', () => {
      const result = validateConnectionPassword('0000');
      expect(result.valid).toBe(true);
    });

    test('should accept all nines', () => {
      const result = validateConnectionPassword('9999');
      expect(result.valid).toBe(true);
    });
  });

  describe('validateObjectId', () => {
    test('should accept valid ObjectId format', () => {
      const result = validateObjectId('507f1f77bcf86cd799439011');
      expect(result.valid).toBe(true);
    });

    test('should accept all zeros ObjectId', () => {
      const result = validateObjectId('000000000000000000000000');
      expect(result.valid).toBe(true);
    });

    test('should accept all f ObjectId', () => {
      const result = validateObjectId('ffffffffffffffffffffffff');
      expect(result.valid).toBe(true);
    });

    test('should reject ObjectId shorter than 24 characters', () => {
      const result = validateObjectId('507f1f77bcf86cd79943901');
      expect(result.valid).toBe(false);
    });

    test('should reject ObjectId longer than 24 characters', () => {
      const result = validateObjectId('507f1f77bcf86cd7994390111');
      expect(result.valid).toBe(false);
    });

    test('should reject ObjectId with invalid characters', () => {
      const result = validateObjectId('507f1f77bcf86cd79943901g');
      expect(result.valid).toBe(false);
    });

    test('should reject uppercase G', () => {
      const result = validateObjectId('507f1f77bcf86cd79943901G');
      expect(result.valid).toBe(false);
    });

    test('should reject empty ObjectId', () => {
      const result = validateObjectId('');
      expect(result.valid).toBe(false);
    });

    test('should reject null ObjectId', () => {
      const result = validateObjectId(null);
      expect(result.valid).toBe(false);
    });
  });

  describe('sanitizeString', () => {
    test('should trim whitespace', () => {
      const result = sanitizeString('  hello  ');
      expect(result).toBe('hello');
    });

    test('should limit length', () => {
      const result = sanitizeString('a'.repeat(300), 50);
      expect(result.length).toBe(50);
    });

    test('should use default max length', () => {
      const result = sanitizeString('a'.repeat(300));
      expect(result.length).toBe(255);
    });

    test('should return empty string for null input', () => {
      const result = sanitizeString(null);
      expect(result).toBe('');
    });

    test('should return empty string for undefined input', () => {
      const result = sanitizeString(undefined);
      expect(result).toBe('');
    });

    test('should return empty string for non-string input', () => {
      expect(sanitizeString(123)).toBe('');
      expect(sanitizeString({})).toBe('');
      expect(sanitizeString([])).toBe('');
    });
  });

  describe('validatePagination', () => {
    test('should parse valid page number', () => {
      const result = validatePagination('1', '20');
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });

    test('should default to page 1 for invalid page', () => {
      const result = validatePagination('invalid', '20');
      expect(result.page).toBe(1);
    });

    test('should default to page 1 for null page', () => {
      const result = validatePagination(null, '20');
      expect(result.page).toBe(1);
    });

    test('should default to pageSize 20 for invalid pageSize', () => {
      const result = validatePagination('1', 'invalid');
      expect(result.pageSize).toBe(20);
    });

    test('should cap pageSize at maxPageSize', () => {
      const result = validatePagination('1', '200', 100);
      expect(result.pageSize).toBe(100);
    });

    test('should enforce minimum page of 1', () => {
      const result = validatePagination('-5', '20');
      expect(result.page).toBe(1);
    });

    test('should enforce minimum pageSize of 1', () => {
      const result = validatePagination('1', '-10');
      expect(result.pageSize).toBe(1);
    });

    test('should handle numeric inputs', () => {
      const result = validatePagination(1, 50);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(50);
    });

    test('should handle undefined inputs', () => {
      const result = validatePagination(undefined, undefined);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });
  });
});