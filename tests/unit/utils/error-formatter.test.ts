import { describe, it, expect } from 'vitest';

import {
  formatError,
  createConnectionError,
  createNotFoundError,
  createTimeoutError,
  createValidationError,
  createParsingError,
  createSecurityError,
  createCertificateError,
  isSSLCertificateError,
} from '../../../src/utils/error-formatter.js';
import { ErrorCategory } from '../../../src/utils/error-constants.js';

describe('formatError', () => {
  it('leads with the category and the operation context', () => {
    const { message } = formatError(ErrorCategory.CONNECTION_ERROR, {
      category: ErrorCategory.CONNECTION_ERROR,
      operation: 'list components',
      resource: 'components list',
    });

    expect(message).toMatch(/^\[CONNECTION_ERROR\]: /);
    expect(message).toContain('Context: list components for components list');
    expect(message).toContain('Suggestion: ');
  });

  it('drops the "for <resource>" clause when there is no resource', () => {
    const { message } = formatError(ErrorCategory.PARSING_ERROR, {
      category: ErrorCategory.PARSING_ERROR,
      operation: 'parse index',
    });

    expect(message).toContain('Context: parse index\n');
  });

  it('always includes what actually went wrong', () => {
    // Regression: the underlying message used to be printed only when
    // NODE_ENV=development, so in normal use a pagination failure was reported
    // as "Unable to connect to Storybook" with the real cause thrown away.
    const { message } = formatError(
      ErrorCategory.CONNECTION_ERROR,
      { category: ErrorCategory.CONNECTION_ERROR, operation: 'list components' },
      new Error('Page 9 exceeds total pages (3).')
    );

    expect(message).toContain('Details: Page 9 exceeds total pages (3).');
  });

  it('accepts a plain string as the original error', () => {
    const { message } = formatError(
      ErrorCategory.VALIDATION_ERROR,
      { category: ErrorCategory.VALIDATION_ERROR, operation: 'validate' },
      'pageSize must be between 1 and 100'
    );

    expect(message).toContain('Details: pageSize must be between 1 and 100');
  });

  it('omits the details line when there is nothing to say', () => {
    const withoutError = formatError(ErrorCategory.NOT_FOUND_ERROR, {
      category: ErrorCategory.NOT_FOUND_ERROR,
      operation: 'find story',
    });
    const withEmptyError = formatError(
      ErrorCategory.NOT_FOUND_ERROR,
      { category: ErrorCategory.NOT_FOUND_ERROR, operation: 'find story' },
      new Error('')
    );

    expect(withoutError.message).not.toContain('Details:');
    expect(withEmptyError.message).not.toContain('Details:');
  });

  it('lists the context details it was given', () => {
    const { message } = formatError(ErrorCategory.TIMEOUT_ERROR, {
      category: ErrorCategory.TIMEOUT_ERROR,
      operation: 'fetch component HTML',
      url: 'http://localhost:6006/iframe.html?id=button--primary',
      storyId: 'button--primary',
      componentName: 'Button',
      timeout: 15000,
      statusCode: 504,
    });

    expect(message).toContain('URL: http://localhost:6006/iframe.html?id=button--primary');
    expect(message).toContain('Story ID: button--primary');
    expect(message).toContain('Component: Button');
    expect(message).toContain('Timeout: 15000ms');
    expect(message).toContain('Status: 504');
  });

  it('appends numbered troubleshooting steps by default', () => {
    const error = formatError(ErrorCategory.CONNECTION_ERROR, {
      category: ErrorCategory.CONNECTION_ERROR,
      operation: 'connect',
    });

    expect(error.message).toContain('Troubleshooting:');
    expect(error.troubleshooting?.length).toBeGreaterThan(0);
  });

  it('can leave troubleshooting out and cap the number of steps', () => {
    const bare = formatError(
      ErrorCategory.CONNECTION_ERROR,
      { category: ErrorCategory.CONNECTION_ERROR, operation: 'connect' },
      undefined,
      { includeTroubleshooting: false }
    );
    const capped = formatError(
      ErrorCategory.CONNECTION_ERROR,
      { category: ErrorCategory.CONNECTION_ERROR, operation: 'connect' },
      undefined,
      { maxTroubleshootingSteps: 1 }
    );

    expect(bare.message).not.toContain('Troubleshooting:');
    expect(bare.troubleshooting).toBeUndefined();
    expect(capped.troubleshooting).toHaveLength(1);
  });
});

describe('error constructors', () => {
  it('records the status code on a connection error', () => {
    const error = createConnectionError(
      'fetch component HTML',
      'http://localhost:6006',
      'boom',
      503
    );

    expect(error.category).toBe(ErrorCategory.CONNECTION_ERROR);
    expect(error.message).toContain('Status: 503');
    expect(error.message).toContain('Details: boom');
  });

  it('replaces the default suggestion on a not-found error', () => {
    const error = createNotFoundError(
      'fetch component HTML',
      'story',
      'Use list_components to find available stories',
      'button--primary'
    );

    expect(error.message).toContain('Suggestion: Use list_components to find available stories');
    expect(error.message).not.toContain('Suggestion: Use list_components or search_components');
    expect(error.message).toContain('Story ID: button--primary');
  });

  it('keeps the default suggestion when none is supplied', () => {
    const error = createNotFoundError('fetch component HTML', 'story');

    expect(error.message).toContain('Suggestion: Use list_components or search_components');
  });

  it('states the elapsed timeout twice: as context and as the cause', () => {
    const error = createTimeoutError(
      'fetch component HTML',
      15000,
      'http://localhost:6006',
      'story'
    );

    expect(error.message).toContain('Timeout: 15000ms');
    expect(error.message).toContain('Details: Operation timed out after 15000ms');
  });

  it('names the offending parameter on a validation error', () => {
    const error = createValidationError('list components', 'must be 1-100', 'pageSize');

    expect(error.message).toContain('Context: list components for pageSize');
    expect(error.message).toContain('Details: must be 1-100');
  });

  it('builds parsing, security and certificate errors in their own category', () => {
    expect(createParsingError('parse CSS', 'stylesheet').category).toBe(
      ErrorCategory.PARSING_ERROR
    );
    expect(createSecurityError('fetch CSS', 'https://cdn.example.com').category).toBe(
      ErrorCategory.SECURITY_ERROR
    );
    expect(createCertificateError('fetch CSS', 'https://internal.example.com').category).toBe(
      ErrorCategory.CERTIFICATE_ERROR
    );
  });
});

describe('isSSLCertificateError', () => {
  it('recognises certificate failures by message', () => {
    expect(isSSLCertificateError(new Error('self-signed certificate in chain'))).toBe(true);
    expect(isSSLCertificateError(new Error('unable to verify the first certificate'))).toBe(true);
    expect(isSSLCertificateError('SSL handshake failed')).toBe(true);
    expect(isSSLCertificateError('TLS alert')).toBe(true);
  });

  it('recognises certificate failures by Node error code', () => {
    expect(isSSLCertificateError({ code: 'CERT_HAS_EXPIRED' })).toBe(true);
    expect(isSSLCertificateError({ code: 'ERR_TLS_CERT_ALTNAME_INVALID' })).toBe(true);
  });

  it('reads the message off a plain thrown object', () => {
    // Regression: String({...}) is "[object Object]", so every substring check
    // missed and undici-style rejections were miscategorised as generic
    // connection failures.
    expect(isSSLCertificateError({ message: 'certificate has expired' })).toBe(true);
  });

  it('falls back to the serialised object when there is no message', () => {
    expect(isSSLCertificateError({ reason: 'bad certificate' })).toBe(true);
  });

  it('rejects unrelated and empty errors', () => {
    expect(isSSLCertificateError(new Error('connect ECONNREFUSED'))).toBe(false);
    expect(isSSLCertificateError({ code: 'ENOTFOUND' })).toBe(false);
    expect(isSSLCertificateError(null)).toBe(false);
    expect(isSSLCertificateError(undefined)).toBe(false);
    expect(isSSLCertificateError('')).toBe(false);
  });
});
