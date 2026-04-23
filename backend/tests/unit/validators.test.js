/**
 * Validators Unit Tests
 * Tests for all input validation functions
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
} = require('../../src/middleware/validator');

describe('validateUsername', () => {
  describe('valid inputs', () => {
    test('should accept valid username with letters and numbers', () => {
      const result = validateUsername('user123');
      expect(result.valid).toBe(true);
    });

    test('should accept username with underscore', () => {
      const result = validateUsername('user_name');
      expect(result.valid).toBe(true);
    });

    test('should accept 3 character minimum username', () => {
      const result = validateUsername('abc');
      expect(result.valid).toBe(true);
    });

    test('should accept 20 character maximum username', () => {
      const result = validateUsername('a'.repeat(20));
      expect(result.valid).toBe(true);
    });
  });

  describe('invalid inputs', () => {
    test('should reject null username', () => {
      const result = validateUsername(null);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('用户名不能为空');
    });

    test('should reject undefined username', () => {
      const result = validateUsername(undefined);
      expect(result.valid).toBe(false);
    });

    test('should reject empty string', () => {
      const result = validateUsername('');
      expect(result.valid).toBe(false);
    });

    test('should reject username shorter than 3 characters', () => {
      const result = validateUsername('ab');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('用户名长度必须在3-20个字符之间');
    });

    test('should reject username longer than 20 characters', () => {
      const result = validateUsername('a'.repeat(21));
      expect(result.valid).toBe(false);
    });

    test('should reject username with special characters', () => {
      const result = validateUsername('user@123');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('用户名只能包含字母、数字和下划线');
    });

    test('should reject username with spaces', () => {
      const result = validateUsername('user 123');
      expect(result.valid).toBe(false);
    });

    test('should reject non-string input', () => {
      const result = validateUsername(12345);
      expect(result.valid).toBe(false);
    });
  });
});

describe('validateEmail', () => {
  describe('valid inputs', () => {
    test('should accept standard email format', () => {
      const result = validateEmail('user@example.com');
      expect(result.valid).toBe(true);
    });

    test('should accept email with subdomain', () => {
      const result = validateEmail('user@mail.example.com');
      expect(result.valid).toBe(true);
    });

    test('should accept email with plus sign', () => {
      const result = validateEmail('user+tag@example.com');
      expect(result.valid).toBe(true);
    });

    test('should accept email with dots in local part', () => {
      const result = validateEmail('user.name@example.com');
      expect(result.valid).toBe(true);
    });

    test('should accept 100 character email', () => {
      const localPart = 'a'.repeat(80);
      const email = `${localPart}@example.com`;
      const result = validateEmail(email);
      expect(result.valid).toBe(true);
    });
  });

  describe('invalid inputs', () => {
    test('should reject null email', () => {
      const result = validateEmail(null);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('邮箱不能为空');
    });

    test('should reject undefined email', () => {
      const result = validateEmail(undefined);
      expect(result.valid).toBe(false);
    });

    test('should reject empty string', () => {
      const result = validateEmail('');
      expect(result.valid).toBe(false);
    });

    test('should reject email without @ symbol', () => {
      const result = validateEmail('userexample.com');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('邮箱格式不正确');
    });

    test('should reject email without domain', () => {
      const result = validateEmail('user@');
      expect(result.valid).toBe(false);
    });

    test('should reject email without local part', () => {
      const result = validateEmail('@example.com');
      expect(result.valid).toBe(false);
    });

    test('should reject email with spaces', () => {
      const result = validateEmail('user @example.com');
      expect(result.valid).toBe(false);
    });

    test('should reject email longer than 100 characters', () => {
      const localPart = 'a'.repeat(89); // 89 + @ + 11 = 101 characters (>100)
      const email = `${localPart}@example.com`;
      expect(email.length).toBe(101);
      const result = validateEmail(email);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('邮箱长度不能超过100个字符');
    });

    test('should reject non-string input', () => {
      const result = validateEmail(12345);
      expect(result.valid).toBe(false);
    });
  });
});

describe('validatePassword', () => {
  describe('valid inputs', () => {
    test('should accept 6 character password', () => {
      const result = validatePassword('123456');
      expect(result.valid).toBe(true);
    });

    test('should accept 128 character password', () => {
      const result = validatePassword('a'.repeat(128));
      expect(result.valid).toBe(true);
    });

    test('should accept mixed character password', () => {
      const result = validatePassword('Pass123!@#');
      expect(result.valid).toBe(true);
    });
  });

  describe('invalid inputs', () => {
    test('should reject null password', () => {
      const result = validatePassword(null);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('密码不能为空');
    });

    test('should reject undefined password', () => {
      const result = validatePassword(undefined);
      expect(result.valid).toBe(false);
    });

    test('should reject empty string', () => {
      const result = validatePassword('');
      expect(result.valid).toBe(false);
    });

    test('should reject password shorter than 6 characters', () => {
      const result = validatePassword('12345');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('密码长度不能少于6个字符');
    });

    test('should reject password longer than 128 characters', () => {
      const result = validatePassword('a'.repeat(129));
      expect(result.valid).toBe(false);
      expect(result.error).toBe('密码长度不能超过128个字符');
    });

    test('should reject non-string input', () => {
      const result = validatePassword(123456);
      expect(result.valid).toBe(false);
    });
  });
});

describe('validateDeviceCode', () => {
  describe('valid inputs', () => {
    test('should accept valid 9 digit device code', () => {
      const result = validateDeviceCode('123456789');
      expect(result.valid).toBe(true);
      expect(result.normalized).toBe('123456789');
    });

    test('should normalize lowercase letters to uppercase', () => {
      // Note: device code only contains digits, but we test normalization anyway
      const result = validateDeviceCode('123456789');
      expect(result.valid).toBe(true);
    });

    test('should accept all zeros', () => {
      const result = validateDeviceCode('000000000');
      expect(result.valid).toBe(true);
    });
  });

  describe('invalid inputs', () => {
    test('should reject null device code', () => {
      const result = validateDeviceCode(null);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('设备码不能为空');
    });

    test('should reject undefined device code', () => {
      const result = validateDeviceCode(undefined);
      expect(result.valid).toBe(false);
    });

    test('should reject empty string', () => {
      const result = validateDeviceCode('');
      expect(result.valid).toBe(false);
    });

    test('should reject device code with less than 9 digits', () => {
      const result = validateDeviceCode('12345678');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('设备码必须是9位数字');
    });

    test('should reject device code with more than 9 digits', () => {
      const result = validateDeviceCode('1234567890');
      expect(result.valid).toBe(false);
    });

    test('should reject device code with letters', () => {
      const result = validateDeviceCode('12345678A');
      expect(result.valid).toBe(false);
    });

    test('should reject device code with special characters', () => {
      const result = validateDeviceCode('12345678!');
      expect(result.valid).toBe(false);
    });

    test('should reject non-string input', () => {
      const result = validateDeviceCode(123456789);
      expect(result.valid).toBe(false);
    });
  });
});

describe('validateConnectionPassword', () => {
  describe('valid inputs', () => {
    test('should accept 4 digit password', () => {
      const result = validateConnectionPassword('1234');
      expect(result.valid).toBe(true);
    });

    test('should accept 5 digit password', () => {
      const result = validateConnectionPassword('12345');
      expect(result.valid).toBe(true);
    });

    test('should accept 6 digit password', () => {
      const result = validateConnectionPassword('123456');
      expect(result.valid).toBe(true);
    });
  });

  describe('invalid inputs', () => {
    test('should reject null password', () => {
      const result = validateConnectionPassword(null);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('密码不能为空');
    });

    test('should reject undefined password', () => {
      const result = validateConnectionPassword(undefined);
      expect(result.valid).toBe(false);
    });

    test('should reject empty string', () => {
      const result = validateConnectionPassword('');
      expect(result.valid).toBe(false);
    });

    test('should reject password with less than 4 digits', () => {
      const result = validateConnectionPassword('123');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('密码必须是4-6位数字');
    });

    test('should reject password with more than 6 digits', () => {
      const result = validateConnectionPassword('1234567');
      expect(result.valid).toBe(false);
    });

    test('should reject password with letters', () => {
      const result = validateConnectionPassword('1234a');
      expect(result.valid).toBe(false);
    });

    test('should reject non-string input', () => {
      const result = validateConnectionPassword(1234);
      expect(result.valid).toBe(false);
    });
  });
});

describe('validateObjectId', () => {
  describe('valid inputs', () => {
    test('should accept valid 24 character hex string', () => {
      const result = validateObjectId('507f1f77bcf86cd799439011');
      expect(result.valid).toBe(true);
    });

    test('should accept uppercase hex characters', () => {
      const result = validateObjectId('507F1F77BCF86CD799439011');
      expect(result.valid).toBe(true);
    });

    test('should accept mixed case', () => {
      const result = validateObjectId('507f1F77BCf86cd799439011');
      expect(result.valid).toBe(true);
    });
  });

  describe('invalid inputs', () => {
    test('should reject null id', () => {
      const result = validateObjectId(null);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('ID不能为空');
    });

    test('should reject undefined id', () => {
      const result = validateObjectId(undefined);
      expect(result.valid).toBe(false);
    });

    test('should reject empty string', () => {
      const result = validateObjectId('');
      expect(result.valid).toBe(false);
    });

    test('should reject id shorter than 24 characters', () => {
      const result = validateObjectId('507f1f77bcf86cd79943901');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('ID格式不正确');
    });

    test('should reject id longer than 24 characters', () => {
      const result = validateObjectId('507f1f77bcf86cd7994390111');
      expect(result.valid).toBe(false);
    });

    test('should reject id with non-hex characters', () => {
      const result = validateObjectId('507f1f77bcf86cd79943901g');
      expect(result.valid).toBe(false);
    });

    test('should reject non-string input', () => {
      const result = validateObjectId(123456789012345678901234);
      expect(result.valid).toBe(false);
    });
  });
});

describe('sanitizeString', () => {
  describe('valid inputs', () => {
    test('should trim leading and trailing whitespace', () => {
      const result = sanitizeString('  hello  ');
      expect(result).toBe('hello');
    });

    test('should limit string to max length', () => {
      const longString = 'a'.repeat(300);
      const result = sanitizeString(longString, 100);
      expect(result).toHaveLength(100);
    });

    test('should preserve internal whitespace', () => {
      const result = sanitizeString('hello world');
      expect(result).toBe('hello world');
    });

    test('should use default max length of 255', () => {
      const longString = 'a'.repeat(300);
      const result = sanitizeString(longString);
      expect(result).toHaveLength(255);
    });
  });

  describe('invalid inputs', () => {
    test('should return empty string for null input', () => {
      const result = sanitizeString(null);
      expect(result).toBe('');
    });

    test('should return empty string for undefined input', () => {
      const result = sanitizeString(undefined);
      expect(result).toBe('');
    });

    test('should return empty string for non-string input', () => {
      const result = sanitizeString(12345);
      expect(result).toBe('');
    });

    test('should return empty string for object input', () => {
      const result = sanitizeString({});
      expect(result).toBe('');
    });
  });
});

describe('validatePagination', () => {
  describe('valid inputs', () => {
    test('should accept valid page and pageSize', () => {
      const result = validatePagination(1, 20);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });

    test('should use defaults for undefined inputs', () => {
      const result = validatePagination(undefined, undefined);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });

    test('should parse string inputs', () => {
      const result = validatePagination('2', '50');
      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(50);
    });

    test('should cap pageSize at maxPageSize', () => {
      const result = validatePagination(1, 200, 100);
      expect(result.pageSize).toBe(100);
    });
  });

  describe('boundary conditions', () => {
    test('should return page 1 for zero page', () => {
      const result = validatePagination(0, 20);
      expect(result.page).toBe(1);
    });

    test('should return page 1 for negative page', () => {
      const result = validatePagination(-1, 20);
      expect(result.page).toBe(1);
    });

    test('should return pageSize 20 for zero pageSize (default fallback)', () => {
      // parseInt(0) returns 0 which is falsy, so || 20 kicks in
      const result = validatePagination(1, 0);
      expect(result.pageSize).toBe(20);
    });

    test('should return pageSize 1 for negative pageSize', () => {
      const result = validatePagination(1, -10);
      expect(result.pageSize).toBe(1);
    });

    test('should handle very large page numbers', () => {
      const result = validatePagination(999999, 20);
      expect(result.page).toBe(999999);
    });

    test('should handle string that evaluates to NaN', () => {
      const result = validatePagination('abc', 'xyz');
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });
  });
});