import { ToolResponse } from '../types/tools.js';
import { FormattedError, formatError } from './error-formatter.js';
import { ErrorCategory, ErrorContext } from './error-constants.js';

export function handleError(error: unknown): ToolResponse {
  let message = 'An unknown error occurred';

  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === 'string') {
    message = error;
  }

  return {
    content: [
      {
        type: 'text',
        text: `Error: ${message}`,
      },
    ],
  };
}

/**
 * Enhanced error handler with category-based formatting
 */
export function handleFormattedError(formattedError: FormattedError): ToolResponse {
  return {
    content: [
      {
        type: 'text',
        text: `Error: ${formattedError.message}`,
      },
    ],
  };
}

/**
 * Handle error with automatic categorization and formatting
 */
export function handleCategorizedError(
  category: ErrorCategory,
  context: ErrorContext,
  originalError?: Error | string
): ToolResponse {
  const formattedError = formatError(category, context, originalError);
  return handleFormattedError(formattedError);
}

/**
 * Enhanced error handler that tries to categorize common error patterns
 */
export function handleErrorWithContext(
  error: unknown,
  operation: string,
  context: Partial<ErrorContext> = {}
): ToolResponse {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const lowerMessage = errorMessage.toLowerCase();

  let category: ErrorCategory;
  const fullContext: ErrorContext = {
    operation,
    category: ErrorCategory.CONNECTION_ERROR, // default, will be overridden
    ...context,
  };

  // Auto-categorize based on error patterns
  if (lowerMessage.includes('timeout') || lowerMessage.includes('timed out')) {
    category = ErrorCategory.TIMEOUT_ERROR;
  } else if (lowerMessage.includes('not found') || lowerMessage.includes('404')) {
    category = ErrorCategory.NOT_FOUND_ERROR;
  } else if (lowerMessage.includes('cors') || lowerMessage.includes('blocked by client')) {
    category = ErrorCategory.SECURITY_ERROR;
  } else if (lowerMessage.includes('parse') || lowerMessage.includes('invalid') || lowerMessage.includes('malformed')) {
    category = ErrorCategory.PARSING_ERROR;
  } else if (lowerMessage.includes('validation') || lowerMessage.includes('required')) {
    category = ErrorCategory.VALIDATION_ERROR;
  } else {
    category = ErrorCategory.CONNECTION_ERROR;
  }

  fullContext.category = category;
  return handleCategorizedError(category, fullContext, error);
}

export function formatSuccessResponse(data: any, message?: string): ToolResponse {
  return {
    content: [
      {
        type: 'text',
        text: message
          ? `${message}\n\n${JSON.stringify(data, null, 2)}`
          : JSON.stringify(data, null, 2),
      },
    ],
  };
}

export function formatTextResponse(text: string): ToolResponse {
  return {
    content: [
      {
        type: 'text',
        text,
      },
    ],
  };
}

/**
 * Legacy compatibility wrapper - maintains existing API
 */
export function handleErrorLegacy(error: unknown): ToolResponse {
  return handleError(error);
}
