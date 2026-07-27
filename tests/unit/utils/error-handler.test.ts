import { describe, it, expect } from 'vitest';
import {
  handleError,
  formatSuccessResponse,
  formatTextResponse,
} from '../../../src/utils/error-handler.js';

describe('error-handler', () => {
  describe('handleError', () => {
    it('should handle Error objects', () => {
      const error = new Error('Test error message');

      const result = handleError(error);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error: Test error message',
          },
        ],
        isError: true,
      });
    });

    it('should handle string errors', () => {
      const error = 'String error message';

      const result = handleError(error);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error: String error message',
          },
        ],
        isError: true,
      });
    });

    it('should handle unknown error types', () => {
      const error = { some: 'object' };

      const result = handleError(error);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error: An unknown error occurred',
          },
        ],
        isError: true,
      });
    });
  });

  describe('formatSuccessResponse', () => {
    it('wraps an array so structuredContent stays an object', () => {
      // structuredContent must be an object, and several tools return a bare
      // array, so those handlers pass an explicit wrapper.
      const items = [{ id: 'a' }];

      expect(formatSuccessResponse(items).structuredContent).toBeUndefined();
      expect(formatSuccessResponse(items, undefined, { items }).structuredContent).toEqual({
        items,
      });
    });

    it('should format data without message', () => {
      const data = { key: 'value' };

      const result = formatSuccessResponse(data);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: JSON.stringify(data, null, 2),
          },
        ],
        structuredContent: data,
      });
    });

    it('should format data with message', () => {
      const data = { key: 'value' };
      const message = 'Success message';

      const result = formatSuccessResponse(data, message);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: `Success message\n\n${JSON.stringify(data, null, 2)}`,
          },
        ],
        structuredContent: data,
      });
    });
  });

  describe('formatTextResponse', () => {
    it('should format text response', () => {
      const text = 'Simple text response';

      const result = formatTextResponse(text);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Simple text response',
          },
        ],
      });
    });
  });
});
