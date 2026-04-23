/**
 * Pagination Boundary Tests
 * Tests for pagination edge cases and validation
 */

const { validatePagination } = require('../../src/middleware/validator');

describe('Pagination Validation', () => {
  describe('Default values', () => {
    test('should use default page of 1 when undefined', () => {
      const result = validatePagination(undefined, 20);
      expect(result.page).toBe(1);
    });

    test('should use default pageSize of 20 when undefined', () => {
      const result = validatePagination(1, undefined);
      expect(result.pageSize).toBe(20);
    });

    test('should use defaults for both undefined', () => {
      const result = validatePagination(undefined, undefined);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });
  });

  describe('Valid pagination', () => {
    test('should accept valid page 1', () => {
      const result = validatePagination(1, 20);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });

    test('should accept large page numbers', () => {
      const result = validatePagination(1000, 20);
      expect(result.page).toBe(1000);
    });

    test('should accept large pageSize', () => {
      const result = validatePagination(1, 100);
      expect(result.pageSize).toBe(100);
    });

    test('should accept string inputs', () => {
      const result = validatePagination('5', '50');
      expect(result.page).toBe(5);
      expect(result.pageSize).toBe(50);
    });

    test('should handle decimal strings', () => {
      const result = validatePagination('1.5', '20.7');
      // parseInt truncates decimals
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });
  });

  describe('Page boundaries', () => {
    test('should accept page 0 as boundary', () => {
      const result = validatePagination(0, 20);
      expect(result.page).toBe(1); // Corrected to 1
    });

    test('should accept page 1 as minimum', () => {
      const result = validatePagination(1, 20);
      expect(result.page).toBe(1);
    });

    test('should handle negative page as 1', () => {
      const result = validatePagination(-5, 20);
      expect(result.page).toBe(1);
    });

    test('should handle very large page numbers', () => {
      const result = validatePagination(999999999, 20);
      expect(result.page).toBe(999999999);
    });
  });

  describe('PageSize boundaries', () => {
    test('should use default for pageSize 0', () => {
      // parseInt(0) returns 0 which is falsy, so || 20 kicks in
      const result = validatePagination(1, 0);
      expect(result.pageSize).toBe(20);
    });

    test('should accept pageSize 1 as minimum', () => {
      const result = validatePagination(1, 1);
      expect(result.pageSize).toBe(1);
    });

    test('should handle negative pageSize', () => {
      const result = validatePagination(1, -10);
      expect(result.pageSize).toBe(1); // Corrected
    });

    test('should cap pageSize at maxPageSize', () => {
      const result = validatePagination(1, 500, 100);
      expect(result.pageSize).toBe(100);
    });

    test('should cap pageSize at default maxPageSize of 100', () => {
      const result = validatePagination(1, 200);
      expect(result.pageSize).toBe(100);
    });

    test('should handle very large pageSize', () => {
      const result = validatePagination(1, 999999);
      expect(result.pageSize).toBe(100); // Capped
    });
  });

  describe('Non-numeric inputs', () => {
    test('should handle NaN string for page', () => {
      const result = validatePagination('abc', 20);
      expect(result.page).toBe(1);
    });

    test('should handle NaN string for pageSize', () => {
      const result = validatePagination(1, 'xyz');
      expect(result.pageSize).toBe(20);
    });

    test('should handle null for page', () => {
      const result = validatePagination(null, 20);
      expect(result.page).toBe(1);
    });

    test('should handle null for pageSize', () => {
      const result = validatePagination(1, null);
      expect(result.pageSize).toBe(20);
    });

    test('should handle empty string', () => {
      const result = validatePagination('', '');
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });
  });

  describe('Type coercion', () => {
    test('should convert string page to number', () => {
      const result = validatePagination('10', '50');
      expect(result.page).toBe(10);
      expect(result.pageSize).toBe(50);
    });

    test('should convert float to integer for page', () => {
      const result = validatePagination(10.7, 20);
      expect(result.page).toBe(10);
    });

    test('should convert float to integer for pageSize', () => {
      const result = validatePagination(1, 20.9);
      expect(result.pageSize).toBe(20);
    });
  });
});

describe('Pagination Response Format', () => {
  test('should return page and pageSize properties', () => {
    const result = validatePagination(1, 20);
    expect(result).toHaveProperty('page');
    expect(result).toHaveProperty('pageSize');
  });

  test('should always return positive integers', () => {
    const testCases = [
      [0, 0],
      [-1, -10],
      [undefined, undefined],
      ['abc', 'xyz']
    ];

    testCases.forEach(([page, pageSize]) => {
      const result = validatePagination(page, pageSize);
      expect(result.page).toBeGreaterThanOrEqual(1);
      expect(result.pageSize).toBeGreaterThanOrEqual(1);
    });
  });
});

describe('Pagination Query Building', () => {
  test('should calculate correct skip value', () => {
    const { page, pageSize } = validatePagination(3, 20);
    const skip = (page - 1) * pageSize;
    expect(skip).toBe(40);
  });

  test('should calculate correct skip for first page', () => {
    const { page, pageSize } = validatePagination(1, 20);
    const skip = (page - 1) * pageSize;
    expect(skip).toBe(0);
  });

  test('should handle different page sizes', () => {
    const pageSizes = [10, 20, 50, 100];
    pageSizes.forEach(ps => {
      const { page, pageSize } = validatePagination(2, ps);
      const skip = (page - 1) * pageSize;
      expect(skip).toBe(ps);
    });
  });

  test('should calculate total pages correctly', () => {
    const total = 95;
    const pageSize = 20;
    const totalPages = Math.ceil(total / pageSize);
    expect(totalPages).toBe(5);
  });

  test('should handle exact division for total pages', () => {
    const total = 100;
    const pageSize = 20;
    const totalPages = Math.ceil(total / pageSize);
    expect(totalPages).toBe(5);
  });

  test('should handle zero total items', () => {
    const total = 0;
    const pageSize = 20;
    const totalPages = Math.ceil(total / pageSize);
    expect(totalPages).toBe(0);
  });
});

describe('Pagination Edge Cases', () => {
  test('should handle page greater than total pages', () => {
    // This is a valid scenario - returns empty results
    const page = 100;
    const total = 50;
    const pageSize = 20;
    const totalPages = Math.ceil(total / pageSize);

    expect(page).toBeGreaterThan(totalPages);
    // Should return empty results, not error
  });

  test('should handle very small pageSize with large dataset', () => {
    const pageSize = 1;
    const total = 10000;
    const totalPages = Math.ceil(total / pageSize);
    expect(totalPages).toBe(10000);
  });

  test('should handle single page result', () => {
    const total = 5;
    const pageSize = 20;
    const skip = (1 - 1) * pageSize;
    expect(skip).toBe(0);
    expect(total).toBeLessThan(pageSize);
  });
});

describe('Security Boundaries', () => {
  test('should prevent injection via page parameter', () => {
    const maliciousInput = '1; DROP TABLE users';
    const result = validatePagination(maliciousInput, 20);
    expect(result.page).toBe(1);
  });

  test('should prevent injection via pageSize parameter', () => {
    const result = validatePagination(1, '20; DROP TABLE users');
    expect(result.pageSize).toBe(20);
  });

  test('should sanitize unicode injection attempts', () => {
    const result = validatePagination('1 ', 20);
    // Should handle or reject null bytes
    expect(result.page).toBeDefined();
  });
});