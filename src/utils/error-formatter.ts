import {
  ErrorCategory,
  ErrorContext,
  TroubleshootingStep,
  TROUBLESHOOTING_TEMPLATES,
  ERROR_MESSAGES,
} from './error-constants.js';

export interface FormattedError {
  message: string;
  category: ErrorCategory;
  context?: ErrorContext;
  troubleshooting?: TroubleshootingStep[];
  debug?: string;
}

export interface ErrorFormatOptions {
  includeDebug?: boolean;
  includeTroubleshooting?: boolean;
  maxTroubleshootingSteps?: number;
}

/**
 * Check if we're in development mode
 */
function isDevelopmentMode(): boolean {
  return process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';
}

/**
 * Format error message with standardized structure
 */
export function formatError(
  category: ErrorCategory,
  context: ErrorContext,
  originalError?: Error | string,
  options: ErrorFormatOptions = {}
): FormattedError {
  const {
    includeDebug = isDevelopmentMode(),
    includeTroubleshooting = true,
    maxTroubleshootingSteps = 4,
  } = options;

  const errorInfo = ERROR_MESSAGES[category];
  const troubleshootingSteps = TROUBLESHOOTING_TEMPLATES[category]?.slice(0, maxTroubleshootingSteps);

  // Build main error message
  let message = `[${category}]: ${errorInfo.brief}`;
  
  // Add context information
  if (context.resource) {
    message += `\nContext: ${context.operation} for ${context.resource}`;
  } else {
    message += `\nContext: ${context.operation}`;
  }
  
  // Add suggestion
  message += `\nSuggestion: ${errorInfo.suggestion}`;

  // Add specific context details
  const contextDetails: string[] = [];
  if (context.url) {
    contextDetails.push(`URL: ${context.url}`);
  }
  if (context.storyId) {
    contextDetails.push(`Story ID: ${context.storyId}`);
  }
  if (context.componentName) {
    contextDetails.push(`Component: ${context.componentName}`);
  }
  if (context.timeout) {
    contextDetails.push(`Timeout: ${context.timeout}ms`);
  }
  if (context.statusCode) {
    contextDetails.push(`Status: ${context.statusCode}`);
  }

  if (contextDetails.length > 0) {
    message += `\n\n${contextDetails.join(', ')}`;
  }

  // Add debug information in development
  if (includeDebug && originalError) {
    const debugInfo = typeof originalError === 'string' 
      ? originalError 
      : originalError.message;
    message += `\nDebug: ${debugInfo}`;
  }

  // Add troubleshooting steps
  if (includeTroubleshooting && troubleshootingSteps && troubleshootingSteps.length > 0) {
    message += '\n\nTroubleshooting:';
    troubleshootingSteps.forEach(step => {
      message += `\n${step.step}. ${step.action}: ${step.description}`;
    });
  }

  return {
    message,
    category,
    context,
    troubleshooting: includeTroubleshooting ? troubleshootingSteps : undefined,
    debug: includeDebug && originalError 
      ? (typeof originalError === 'string' ? originalError : originalError.message)
      : undefined,
  };
}

/**
 * Create standardized connection error
 */
export function createConnectionError(
  operation: string,
  url: string,
  originalError?: Error | string,
  statusCode?: number
): FormattedError {
  return formatError(
    ErrorCategory.CONNECTION_ERROR,
    {
      category: ErrorCategory.CONNECTION_ERROR,
      operation,
      url,
      statusCode,
    },
    originalError
  );
}

/**
 * Create standardized not found error
 */
export function createNotFoundError(
  operation: string,
  resource: string,
  suggestion?: string,
  storyId?: string,
  componentName?: string
): FormattedError {
  const context: ErrorContext = {
    category: ErrorCategory.NOT_FOUND_ERROR,
    operation,
    resource,
  };

  if (storyId) context.storyId = storyId;
  if (componentName) context.componentName = componentName;

  const error = formatError(ErrorCategory.NOT_FOUND_ERROR, context);
  
  // Add custom suggestion if provided
  if (suggestion) {
    error.message = error.message.replace(
      'Suggestion: Use list_components or search_components to find available options',
      `Suggestion: ${suggestion}`
    );
  }

  return error;
}

/**
 * Create standardized timeout error
 */
export function createTimeoutError(
  operation: string,
  timeout: number,
  url?: string,
  resource?: string
): FormattedError {
  return formatError(
    ErrorCategory.TIMEOUT_ERROR,
    {
      category: ErrorCategory.TIMEOUT_ERROR,
      operation,
      timeout,
      url,
      resource,
    },
    `Operation timed out after ${timeout}ms`
  );
}

/**
 * Create standardized validation error
 */
export function createValidationError(
  operation: string,
  details: string,
  parameter?: string
): FormattedError {
  return formatError(
    ErrorCategory.VALIDATION_ERROR,
    {
      category: ErrorCategory.VALIDATION_ERROR,
      operation,
      resource: parameter,
    },
    details
  );
}

/**
 * Create standardized parsing error
 */
export function createParsingError(
  operation: string,
  resource: string,
  originalError?: Error | string
): FormattedError {
  return formatError(
    ErrorCategory.PARSING_ERROR,
    {
      category: ErrorCategory.PARSING_ERROR,
      operation,
      resource,
    },
    originalError
  );
}

/**
 * Create standardized security error
 */
export function createSecurityError(
  operation: string,
  url: string,
  originalError?: Error | string
): FormattedError {
  return formatError(
    ErrorCategory.SECURITY_ERROR,
    {
      category: ErrorCategory.SECURITY_ERROR,
      operation,
      url,
    },
    originalError
  );
}