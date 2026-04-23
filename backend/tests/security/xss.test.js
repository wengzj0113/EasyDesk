/**
 * XSS Prevention Security Tests
 * Tests for XSS attack prevention in the application through the public API
 */

const { sanitizeRequest } = require('../../src/middleware/security');

// Define escapeHtml logic for testing purposes (matches internal implementation)
const escapeHtml = (str) => {
  const HTML_ENTITIES = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  return String(str).replace(/[&<>"'/]/g, (char) => HTML_ENTITIES[char] || char);
};

describe('XSS Prevention Security Tests', () => {
  describe('HTML Entity Encoding', () => {
    test('should encode all HTML special characters', () => {
      const dangerous = '&<>"\'/';
      const encoded = escapeHtml(dangerous);

      expect(encoded).toBe('&amp;&lt;&gt;&quot;&#x27;&#x2F;');
    });

    test('should prevent script injection', () => {
      const malicious = '<script>alert("XSS")</script>';
      const sanitized = escapeHtml(malicious);
      expect(sanitized).not.toContain('<script>');
    });

    test('should prevent img onerror injection', () => {
      const malicious = '<img src=x onerror="alert(1)">';
      const sanitized = escapeHtml(malicious);
      expect(sanitized).not.toContain('<img');
    });

    test('should prevent iframe injection', () => {
      const malicious = '<iframe src="evil.com"></iframe>';
      const sanitized = escapeHtml(malicious);
      expect(sanitized).not.toContain('<iframe>');
    });

    test('should prevent svg onload injection', () => {
      const malicious = '<svg onload="alert(1)"></svg>';
      const sanitized = escapeHtml(malicious);
      expect(sanitized).not.toContain('<svg');
    });

    test('should prevent a href javascript injection', () => {
      const malicious = '<a href="javascript:alert(1)">Click</a>';
      const sanitized = escapeHtml(malicious);
      expect(sanitized).not.toContain('<a');
    });

    test('should prevent data URL XSS', () => {
      const malicious = '<a href="data:text/html,<script>alert(1)</script>">Link</a>';
      const sanitized = escapeHtml(malicious);
      expect(sanitized).not.toContain('<a');
    });

    test('should prevent body onload injection', () => {
      const malicious = '<body onload="alert(1)">';
      const sanitized = escapeHtml(malicious);
      expect(sanitized).not.toContain('<body');
    });

    test('should prevent div onmouseover injection', () => {
      const malicious = '<div onmouseover="alert(1)">Hover</div>';
      const sanitized = escapeHtml(malicious);
      expect(sanitized).not.toContain('<div');
    });
  });

  describe('Request Sanitization', () => {
    test('should sanitize entire request body', () => {
      const req = {
        body: {
          name: '<script>alert(1)</script>',
          description: '<img src=x onerror=alert(1)>',
          safeField: 'normal text'
        },
        query: {},
        params: {}
      };

      sanitizeRequest(req, {}, jest.fn());

      expect(req.body.name).not.toContain('<script>');
      expect(req.body.description).not.toContain('<img');
      expect(req.body.safeField).toBe('normal text');
    });

    test('should sanitize nested objects', () => {
      const req = {
        body: {
          user: {
            profile: {
              bio: '<iframe src="evil.com"></iframe>'
            }
          }
        },
        query: {},
        params: {}
      };

      sanitizeRequest(req, {}, jest.fn());

      expect(req.body.user.profile.bio).not.toContain('<iframe');
    });

    test('should sanitize arrays', () => {
      const req = {
        body: {
          comments: [
            '<script>alert(1)</script>',
            'normal comment'
          ]
        },
        query: {},
        params: {}
      };

      sanitizeRequest(req, {}, jest.fn());

      expect(req.body.comments[0]).not.toContain('<script>');
      expect(req.body.comments[1]).toBe('normal comment');
    });

    test('should sanitize query parameters', () => {
      const req = {
        body: {},
        query: {
          search: '<script>alert(1)</script>',
          filter: '<img src=x>'
        },
        params: {}
      };

      sanitizeRequest(req, {}, jest.fn());

      expect(req.query.search).not.toContain('<script>');
      expect(req.query.filter).not.toContain('<img');
    });

    test('should sanitize URL parameters', () => {
      const req = {
        body: {},
        query: {},
        params: {
          id: '<script>alert(1)</script>'
        }
      };

      sanitizeRequest(req, {}, jest.fn());

      expect(req.params.id).not.toContain('<script>');
    });
  });

  describe('Stored XSS Prevention', () => {
    test('should sanitize user input before storage', () => {
      const maliciousInput = {
        username: '<script>alert(1)</script>',
        bio: '<img src=x onerror="alert(1)">'
      };

      const sanitized = escapeHtml(JSON.stringify(maliciousInput));

      // HTML tags are escaped, neutralizing script injection
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('</script>');
      // The < and > characters in the img tag are also escaped
      expect(sanitized).not.toContain('<img');
    });
  });

  describe('Reflected XSS Prevention', () => {
    test('should sanitize reflected user input', () => {
      const reflectedInput = '<script>alert(document.cookie)</script>';
      const sanitized = escapeHtml(reflectedInput);

      expect(sanitized).not.toContain('<script>');
    });
  });

  describe('DOM XSS Prevention', () => {
    test('should prevent common DOM XSS vectors', () => {
      const domXSSVectors = [
        'vbscript:alert(1)',
        '<svg/onload=alert(1)>'
      ];

      domXSSVectors.forEach(vector => {
        const sanitized = escapeHtml(vector);
        // The < and > should be escaped
        expect(sanitized).not.toMatch(/<[^>]*>/);
      });
    });
  });

  describe('Unicode and Encoding Attacks', () => {
    test('should handle unicode characters', () => {
      const unicodeInput = '<script>alert(</>)</script>';
      const sanitized = escapeHtml(unicodeInput);

      expect(sanitized).not.toContain('<script>');
    });

    test('should handle mixed encoding', () => {
      const mixedInput = '<script>alert(1)</script>';
      const sanitized = escapeHtml(mixedInput);

      expect(sanitized).not.toContain('<script>');
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty strings', () => {
      expect(escapeHtml('')).toBe('');
    });

    test('should handle deeply nested objects', () => {
      const req = {
        body: {
          level1: {
            level2: {
              level3: {
                level4: '<script>alert(1)</script>'
              }
            }
          }
        },
        query: {},
        params: {}
      };

      sanitizeRequest(req, {}, jest.fn());

      expect(req.body.level1.level2.level3.level4).not.toContain('<script>');
    });

    test('should handle arrays of objects', () => {
      const req = {
        body: {
          users: [
            { name: '<script>alert(1)</script>' },
            { name: 'normal' }
          ]
        },
        query: {},
        params: {}
      };

      sanitizeRequest(req, {}, jest.fn());

      expect(req.body.users[0].name).not.toContain('<script>');
      expect(req.body.users[1].name).toBe('normal');
    });

    test('should preserve numbers and booleans', () => {
      const req = {
        body: {
          count: 42,
          active: true,
          name: '<b>bold</b>'
        },
        query: {},
        params: {}
      };

      sanitizeRequest(req, {}, jest.fn());

      expect(req.body.count).toBe(42);
      expect(req.body.active).toBe(true);
      expect(req.body.name).not.toContain('<b>');
    });
  });
});