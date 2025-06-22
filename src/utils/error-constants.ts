export enum ErrorCategory {
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  PARSING_ERROR = 'PARSING_ERROR',
  SECURITY_ERROR = 'SECURITY_ERROR',
}

export interface ErrorContext {
  category: ErrorCategory;
  operation: string;
  resource?: string;
  url?: string;
  storyId?: string;
  componentName?: string;
  timeout?: number;
  statusCode?: number;
}

export interface TroubleshootingStep {
  step: number;
  action: string;
  description: string;
}

export const TROUBLESHOOTING_TEMPLATES = {
  [ErrorCategory.CONNECTION_ERROR]: [
    {
      step: 1,
      action: 'Check Storybook Status',
      description: 'Make sure Storybook is running and accessible',
    },
    {
      step: 2,
      action: 'Verify URL',
      description: 'Ensure the Storybook URL is correct',
    },
    {
      step: 3,
      action: 'Check CORS',
      description: 'Verify CORS is properly configured for cross-origin requests',
    },
    {
      step: 4,
      action: 'Test Direct Access',
      description: 'Try accessing the Storybook URL directly in your browser',
    },
  ],
  [ErrorCategory.NOT_FOUND_ERROR]: [
    {
      step: 1,
      action: 'List Available Components',
      description: 'Use list_components tool to see all available components',
    },
    {
      step: 2,
      action: 'Search Components',
      description: 'Use search_components tool to find similar component names',
    },
    {
      step: 3,
      action: 'Check Component ID Format',
      description: 'Ensure the component/story ID follows the correct format',
    },
  ],
  [ErrorCategory.TIMEOUT_ERROR]: [
    {
      step: 1,
      action: 'Check Storybook Performance',
      description: 'Verify Storybook is responding quickly in your browser',
    },
    {
      step: 2,
      action: 'Reduce Load',
      description: 'Try accessing fewer components or simpler stories first',
    },
    {
      step: 3,
      action: 'Check Network',
      description: 'Ensure stable network connection to Storybook instance',
    },
  ],
  [ErrorCategory.PARSING_ERROR]: [
    {
      step: 1,
      action: 'Check Storybook Configuration',
      description: 'Verify Storybook is properly configured and stories are valid',
    },
    {
      step: 2,
      action: 'Validate Story Format',
      description: 'Ensure the story renders correctly in Storybook UI',
    },
  ],
  [ErrorCategory.VALIDATION_ERROR]: [
    {
      step: 1,
      action: 'Check Input Parameters',
      description: 'Verify all required parameters are provided',
    },
    {
      step: 2,
      action: 'Validate Parameter Format',
      description: 'Ensure parameters match the expected format and constraints',
    },
  ],
  [ErrorCategory.SECURITY_ERROR]: [
    {
      step: 1,
      action: 'Check CORS Configuration',
      description: 'Verify CORS headers allow requests from this origin',
    },
    {
      step: 2,
      action: 'Check Content Security Policy',
      description: 'Ensure CSP allows the requested operations',
    },
  ],
} as const;

export const ERROR_MESSAGES = {
  [ErrorCategory.CONNECTION_ERROR]: {
    brief: 'Unable to connect to Storybook',
    suggestion: 'Verify Storybook is running and accessible',
  },
  [ErrorCategory.NOT_FOUND_ERROR]: {
    brief: 'Component or story not found',
    suggestion: 'Use list_components or search_components to find available options',
  },
  [ErrorCategory.TIMEOUT_ERROR]: {
    brief: 'Operation timed out',
    suggestion: 'Check Storybook performance and network connectivity',
  },
  [ErrorCategory.VALIDATION_ERROR]: {
    brief: 'Invalid input parameters',
    suggestion: 'Check parameter format and required fields',
  },
  [ErrorCategory.PARSING_ERROR]: {
    brief: 'Failed to parse content',
    suggestion: 'Verify Storybook configuration and story format',
  },
  [ErrorCategory.SECURITY_ERROR]: {
    brief: 'Security restriction encountered',
    suggestion: 'Check CORS and security policy configuration',
  },
} as const;
