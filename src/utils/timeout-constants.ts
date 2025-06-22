/**
 * Standardized timeout values for different operation types
 */
export const TIMEOUT_VALUES = {
  /**
   * Quick operations (5 seconds)
   * - Component variants fetching
   * - Component search operations
   * - Simple API calls
   */
  QUICK: 5000,

  /**
   * Medium operations (10 seconds) 
   * - HTML content fetching
   * - Stories index loading
   * - Standard Storybook iframe requests
   */
  MEDIUM: 10000,

  /**
   * Heavy operations (15 seconds)
   * - CSS file fetching and parsing
   * - Puppeteer browser operations
   * - Complex rendering operations
   */
  HEAVY: 15000,
} as const;

/**
 * Operation-specific timeout mappings
 */
export const OPERATION_TIMEOUTS = {
  // Storybook API operations
  fetchStoriesIndex: TIMEOUT_VALUES.MEDIUM,
  fetchComponentHTML: TIMEOUT_VALUES.MEDIUM,
  testConnection: TIMEOUT_VALUES.QUICK,

  // Component operations
  getComponentVariants: TIMEOUT_VALUES.QUICK,
  searchComponents: TIMEOUT_VALUES.QUICK,
  listComponents: TIMEOUT_VALUES.QUICK,
  getComponentByPurpose: TIMEOUT_VALUES.QUICK,

  // CSS and parsing operations
  fetchExternalCSS: TIMEOUT_VALUES.HEAVY,
  parseComponentStyles: TIMEOUT_VALUES.MEDIUM,

  // Puppeteer operations
  puppeteerPageLoad: TIMEOUT_VALUES.HEAVY,
  puppeteerElementWait: TIMEOUT_VALUES.MEDIUM,
  puppeteerScreenshot: TIMEOUT_VALUES.HEAVY,
} as const;

/**
 * Get timeout value for a specific operation
 */
export function getOperationTimeout(operation: keyof typeof OPERATION_TIMEOUTS): number {
  return OPERATION_TIMEOUTS[operation];
}

/**
 * Get timeout category name for documentation/logging
 */
export function getTimeoutCategory(timeoutMs: number): string {
  if (timeoutMs <= TIMEOUT_VALUES.QUICK) return 'QUICK';
  if (timeoutMs <= TIMEOUT_VALUES.MEDIUM) return 'MEDIUM';
  return 'HEAVY';
}

/**
 * Get recommended timeout for operation type
 */
export function getRecommendedTimeout(operationType: 'api' | 'parsing' | 'rendering' | 'network'): number {
  switch (operationType) {
    case 'api':
      return TIMEOUT_VALUES.QUICK;
    case 'parsing':
      return TIMEOUT_VALUES.MEDIUM;
    case 'rendering':
      return TIMEOUT_VALUES.HEAVY;
    case 'network':
      return TIMEOUT_VALUES.MEDIUM;
    default:
      return TIMEOUT_VALUES.MEDIUM;
  }
}

/**
 * Environment-based timeout multipliers
 */
export function getEnvironmentTimeout(baseTimeout: number): number {
  const environment = process.env.NODE_ENV;
  const ciMode = process.env.CI === 'true';
  
  // Increase timeouts in CI environments
  if (ciMode) {
    return Math.floor(baseTimeout * 1.5);
  }
  
  // Increase timeouts in development for debugging
  if (environment === 'development') {
    return Math.floor(baseTimeout * 1.2);
  }
  
  return baseTimeout;
}