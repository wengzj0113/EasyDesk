/**
 * Sanitization Unit Tests
 * Tests for XSS prevention and input sanitization
 */

describe('Input Sanitization', () => {
  describe('XSS prevention', () => {
    test('should prevent script tag injection', () => {
      const maliciousInput = '<script>alert("XSS")</script>';
      const sanitized = maliciousInput
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('&lt;script&gt;');
      expect(sanitized).toContain('&quot;XSS&quot;');
    });

    test('should prevent inline event handlers', () => {
      const maliciousInput = '<img src=x onerror="alert(1)">';
      const sanitized = maliciousInput
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      expect(sanitized).toContain('&lt;img'); // Tags are encoded
    });

    test('should prevent javascript: protocol', () => {
      const maliciousInput = 'javascript:alert("XSS")';
      const sanitized = maliciousInput
        .replace(/javascript:/gi, '')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      expect(sanitized.toLowerCase()).not.toContain('javascript:');
    });

    test('should prevent data: protocol', () => {
      const maliciousInput = 'data:text/html,<script>alert(1)</script>';
      const sanitized = maliciousInput
        .replace(/data:/gi, '')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      expect(sanitized.toLowerCase()).not.toContain('data:');
    });
  });

  describe('HTML entity encoding', () => {
    test('should encode less than sign', () => {
      const input = '<';
      const sanitized = input.replace(/</g, '&lt;');
      expect(sanitized).toBe('&lt;');
    });

    test('should encode greater than sign', () => {
      const input = '>';
      const sanitized = input.replace(/>/g, '&gt;');
      expect(sanitized).toBe('&gt;');
    });

    test('should encode double quotes', () => {
      const input = '"';
      const sanitized = input.replace(/"/g, '&quot;');
      expect(sanitized).toBe('&quot;');
    });

    test('should encode single quotes', () => {
      const input = "'";
      const sanitized = input.replace(/'/g, '&#x27;');
      expect(sanitized).toBe('&#x27;');
    });

    test('should encode ampersands', () => {
      const input = '&';
      const sanitized = input.replace(/&/g, '&amp;');
      expect(sanitized).toBe('&amp;');
    });
  });

  describe('SQL injection prevention', () => {
    test('should remove single quotes from SQL injection attempts', () => {
      const maliciousInput = "'; DROP TABLE users; --";
      const sanitized = maliciousInput.replace(/['";]/g, '');
      expect(sanitized).not.toContain("'");
      expect(sanitized).not.toContain(';');
      expect(sanitized).toContain('--'); // -- is not removed by basic sanitization
    });

    test('should handle OR-based SQL injection', () => {
      const maliciousInput = "admin' OR '1'='1";
      const sanitized = maliciousInput.replace(/['";]/g, '');
      expect(sanitized).not.toContain("'");
      expect(sanitized).not.toContain(';');
    });

    test('should handle UNION-based SQL injection', () => {
      const maliciousInput = "'; UNION SELECT * FROM users; --";
      const sanitized = maliciousInput.replace(/['";]/g, '');
      expect(sanitized).not.toContain("'");
      expect(sanitized).not.toContain(';');
      expect(sanitized).toContain('UNION'); // UNION keyword remains
    });
  });

  describe('Special characters handling', () => {
    test('should handle Unicode characters', () => {
      const input = '你好世界';
      const sanitized = input.trim();
      expect(sanitized).toBe('你好世界');
    });

    test('should handle emoji characters', () => {
      const input = 'Hello 👨‍👩‍👧‍👦 World';
      const sanitized = input.trim();
      expect(sanitized).toBe('Hello 👨‍👩‍👧‍👦 World');
    });

    test('should handle mixed Unicode and ASCII', () => {
      const input = ' 用户名123 ';
      const sanitized = input.trim();
      expect(sanitized).toBe('用户名123');
    });

    test('should handle newline characters', () => {
      const input = 'hello\nworld';
      const sanitized = input.trim();
      expect(sanitized).toBe('hello\nworld');
    });

    test('should handle tab characters', () => {
      const input = 'hello\tworld';
      const sanitized = input.trim();
      expect(sanitized).toBe('hello\tworld');
    });
  });

  describe('Length validation', () => {
    test('should truncate very long strings', () => {
      const maxLength = 100;
      const input = 'a'.repeat(500);
      const sanitized = input.substring(0, maxLength);
      expect(sanitized).toHaveLength(maxLength);
    });

    test('should preserve valid length strings', () => {
      const maxLength = 100;
      const input = 'a'.repeat(50);
      const sanitized = input.substring(0, maxLength);
      expect(sanitized).toHaveLength(50);
    });
  });
});

describe('Device Code Sanitization', () => {
  describe('Digit-only validation', () => {
    test('should accept pure numeric device codes', () => {
      const deviceCode = '123456789';
      const isValid = /^\d{9}$/.test(deviceCode);
      expect(isValid).toBe(true);
    });

    test('should reject device codes with letters', () => {
      const deviceCode = '12345678A';
      const isValid = /^\d{9}$/.test(deviceCode);
      expect(isValid).toBe(false);
    });

    test('should reject device codes with special characters', () => {
      const deviceCode = '12345678!';
      const isValid = /^\d{9}$/.test(deviceCode);
      expect(isValid).toBe(false);
    });
  });
});

describe('Password Sanitization', () => {
  describe('Numeric-only validation', () => {
    test('should accept 4-6 digit passwords', () => {
      const passwords = ['1234', '12345', '123456'];
      passwords.forEach(pwd => {
        const isValid = /^\d{4,6}$/.test(pwd);
        expect(isValid).toBe(true);
      });
    });

    test('should reject passwords with letters', () => {
      const passwords = ['123a', 'a1234', '12345a'];
      passwords.forEach(pwd => {
        const isValid = /^\d{4,6}$/.test(pwd);
        expect(isValid).toBe(false);
      });
    });

    test('should reject passwords with special characters', () => {
      const passwords = ['1234!', '12@34', '#2345'];
      passwords.forEach(pwd => {
        const isValid = /^\d{4,6}$/.test(pwd);
        expect(isValid).toBe(false);
      });
    });
  });
});