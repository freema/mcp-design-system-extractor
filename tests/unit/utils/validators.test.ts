import { describe, it, expect } from 'vitest';
import { 
  validateListComponentsInput,
  validateGetComponentHTMLInput,
  validateSearchComponentsInput
} from '../../../src/utils/validators.js';

describe('validators', () => {
  describe('validateListComponentsInput', () => {
    it('should validate valid input with all fields', () => {
      const input = {
        category: 'buttons',
        page: 1,
        pageSize: 10
      };
      
      const result = validateListComponentsInput(input);
      
      expect(result).toEqual({
        category: 'buttons',
        page: 1,
        pageSize: 10
      });
    });

    it('should validate input with only optional fields', () => {
      const input = {};
      
      const result = validateListComponentsInput(input);
      
      expect(result).toEqual({});
    });

    it('should throw error for invalid page size', () => {
      const input = {
        pageSize: 0
      };
      
      expect(() => validateListComponentsInput(input)).toThrow();
    });
  });

  describe('validateGetComponentHTMLInput', () => {
    it('should validate valid input', () => {
      const input = {
        componentId: 'button-primary',
        includeStyles: true
      };
      
      const result = validateGetComponentHTMLInput(input);
      
      expect(result).toEqual({
        componentId: 'button-primary',
        includeStyles: true
      });
    });

    it('should require componentId', () => {
      const input = {};
      
      expect(() => validateGetComponentHTMLInput(input)).toThrow();
    });
  });

  describe('validateSearchComponentsInput', () => {
    it('should validate valid search input', () => {
      const input = {
        query: 'button',
        searchIn: 'name' as const,
        page: 1,
        pageSize: 20
      };
      
      const result = validateSearchComponentsInput(input);
      
      expect(result).toEqual({
        query: 'button',
        searchIn: 'name',
        page: 1,
        pageSize: 20
      });
    });

    it('should require query', () => {
      const input = {};
      
      expect(() => validateSearchComponentsInput(input)).toThrow();
    });
  });
});