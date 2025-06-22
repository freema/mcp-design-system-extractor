import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { StorybookClient } from '../utils/storybook-client.js';
import { handleError, formatSuccessResponse, handleErrorWithContext } from '../utils/error-handler.js';
import { extractDesignTokens } from '../utils/html-parser.js';
import { DesignToken } from '../types/storybook.js';
import { createSecurityError, createConnectionError, createTimeoutError } from '../utils/error-formatter.js';
import { OPERATION_TIMEOUTS, getEnvironmentTimeout } from '../utils/timeout-constants.js';

interface GetExternalCSSInput {
  cssUrl: string;
  extractTokens?: boolean;
  includeFullCSS?: boolean;
  maxContentSize?: number;
}

interface OrganizedTokens {
  colors: Record<string, string>;
  spacing: Record<string, string>;
  typography: Record<string, string>;
  breakpoints: Record<string, string>;
  shadows: Record<string, string>;
  radii: Record<string, string>;
  other: Record<string, string>;
}

interface CSSAnalysis {
  totalRules: number;
  customProperties: number;
  mediaQueries: number;
  selectors: number;
  declarations: number;
}

export const getExternalCSSTool: Tool = {
  name: 'get_external_css',
  description:
    'Extract design tokens from CSS files. DEFAULT BEHAVIOR: Returns ONLY tokens and file statistics (small response ~1-3K tokens). Does NOT return CSS content by default to avoid token limits. For full CSS content, explicitly set includeFullCSS=true and maxContentSize. Perfect for analyzing design system tokens without hitting response size limits.',
  inputSchema: {
    type: 'object',
    properties: {
      cssUrl: {
        type: 'string',
        description:
          'URL of CSS file to analyze. IMPORTANT: Tool returns only design tokens by default (not CSS content) to avoid response size limits.',
      },
      extractTokens: {
        type: 'boolean',
        description:
          'Extract design tokens (colors, spacing, typography, etc.). Default: true. This is the main purpose of this tool.',
      },
      includeFullCSS: {
        type: 'boolean',
        description:
          'OPTIONAL: Set to true ONLY if you need the actual CSS content. WARNING: Large CSS files may hit token limits. Default: false (recommended).',
      },
      maxContentSize: {
        type: 'number',
        description:
          'OPTIONAL: Max CSS content characters when includeFullCSS=true. Default: 10000. Larger files will be truncated.',
      },
    },
    required: ['cssUrl'],
  },
};

function validateGetExternalCSSInput(input: any): GetExternalCSSInput {
  if (!input || typeof input !== 'object') {
    throw new Error('Input must be an object');
  }

  if (!input.cssUrl || typeof input.cssUrl !== 'string') {
    throw new Error('cssUrl must be a non-empty string');
  }

  return {
    cssUrl: input.cssUrl,
    extractTokens: input.extractTokens !== false, // Default to true
    includeFullCSS: input.includeFullCSS === true, // Default to false
    maxContentSize: input.maxContentSize || 10000, // Default to 10000 chars
  };
}

function organizeTokens(tokens: DesignToken[]): OrganizedTokens {
  const organized: OrganizedTokens = {
    colors: {},
    spacing: {},
    typography: {},
    breakpoints: {},
    shadows: {},
    radii: {},
    other: {},
  };

  tokens.forEach(token => {
    const category = getTokenCategory(token);
    organized[category][token.name] = token.value;
  });

  return organized;
}

function getTokenCategory(token: DesignToken): keyof OrganizedTokens {
  switch (token.type) {
    case 'color':
      return 'colors';
    case 'spacing':
      return 'spacing';
    case 'typography':
      return 'typography';
    case 'shadow':
      return 'shadows';
    case 'border':
      return 'radii'; // border styles can include radius info
    case 'other':
    default: {
      // Check token name to categorize 'other' types
      const lowerName = token.name.toLowerCase();
      if (lowerName.includes('breakpoint')) {
        return 'breakpoints';
      }
      if (lowerName.includes('radius') || lowerName.includes('border-radius')) {
        return 'radii';
      }
      return 'other';
    }
  }
}

function isDomainAllowed(cssUrl: string, storybookUrl: string): boolean {
  try {
    const cssUrlObj = new URL(cssUrl);
    const storybookUrlObj = new URL(storybookUrl);

    // Allow same domain and subdomain
    return (
      cssUrlObj.hostname === storybookUrlObj.hostname ||
      cssUrlObj.hostname.endsWith('.' + storybookUrlObj.hostname)
    );
  } catch {
    // If URL parsing fails, it's not allowed
    return false;
  }
}

async function makeAbsoluteUrl(url: string, baseUrl: string): Promise<string> {
  try {
    // If it's already an absolute URL, return it as is
    new URL(url);
    return url;
  } catch {
    // It's a relative URL, make it absolute
    // Remove trailing slash from base URL
    const cleanBase = baseUrl.replace(/\/$/, '');
    // Remove leading slash from relative URL
    const cleanUrl = url.replace(/^\//, '');
    return `${cleanBase}/${cleanUrl}`;
  }
}

export async function handleGetExternalCSS(input: any) {
  try {
    const validatedInput = validateGetExternalCSSInput(input);
    const client = new StorybookClient();
    const baseUrl = client.getStorybookUrl();

    // Make URL absolute if it's relative
    const absoluteUrl = await makeAbsoluteUrl(validatedInput.cssUrl, baseUrl);

    // Security check: Only allow URLs from the same domain as Storybook
    if (!isDomainAllowed(absoluteUrl, baseUrl)) {
      const securityError = createSecurityError(
        'fetch external CSS',
        absoluteUrl,
        'CSS URL domain is not allowed. Only URLs from the Storybook domain are permitted for security reasons.'
      );
      throw new Error(securityError.message);
    }

    // Fetch CSS content with timeout
    const timeout = getEnvironmentTimeout(OPERATION_TIMEOUTS.fetchExternalCSS);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    let response;
    try {
      response = await fetch(absoluteUrl, {
        signal: controller.signal,
        headers: {
          Accept: 'text/css,*/*;q=0.1',
          'User-Agent': 'MCP-Design-System-Extractor/1.0',
        },
      });
    } catch (error: any) {
      if (error.name === 'AbortError') {
        const timeoutError = createTimeoutError(
          'fetch external CSS',
          timeout,
          absoluteUrl,
          'CSS file'
        );
        throw new Error(timeoutError.message);
      }
      const connectionError = createConnectionError(
        'fetch external CSS',
        absoluteUrl,
        error
      );
      throw new Error(connectionError.message);
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const connectionError = createConnectionError(
        'fetch external CSS',
        absoluteUrl,
        `HTTP ${response.status}: ${response.statusText}`,
        response.status
      );
      throw new Error(connectionError.message);
    }

    const cssContent = await response.text();
    const contentLength = cssContent.length;

    // Always perform CSS analysis
    const analysis = analyzeCSSContent(cssContent);

    // Extract design tokens if requested
    let tokens: DesignToken[] = [];
    let organizedTokens: OrganizedTokens | null = null;

    if (validatedInput.extractTokens) {
      tokens = extractDesignTokens(cssContent);
      organizedTokens = organizeTokens(tokens);
    }

    // Build optimized response (tokens-first approach)
    const result: any = {
      url: absoluteUrl,
      originalUrl: validatedInput.cssUrl,
      fileSize: contentLength,
      fileSizeFormatted: formatBytes(contentLength),
      analysis,
      tokensExtracted: validatedInput.extractTokens,
      tokenCount: tokens.length,
      tokens: organizedTokens,
    };

    // Only include CSS content if explicitly requested
    if (validatedInput.includeFullCSS) {
      const maxSize = validatedInput.maxContentSize || 10000;

      if (contentLength <= maxSize) {
        result.content = cssContent;
        result.truncated = false;
        result.displayedSize = contentLength;
      } else {
        result.content =
          cssContent.substring(0, maxSize) +
          '\n\n/* ... Content truncated due to size limit ... */';
        result.truncated = true;
        result.displayedSize = maxSize;
        result.truncationWarning = `Content truncated from ${formatBytes(contentLength)} to ${formatBytes(maxSize)}. Use maxContentSize parameter to adjust limit.`;
      }
    }

    const message = validatedInput.includeFullCSS
      ? `CSS content included from ${validatedInput.cssUrl} (${formatBytes(contentLength)})${
          result.truncated ? ' - TRUNCATED due to size' : ''
        }${validatedInput.extractTokens ? `, ${tokens.length} design tokens extracted` : ''}`
      : `SUCCESS: Extracted ${tokens.length} design tokens from ${validatedInput.cssUrl} (${formatBytes(contentLength)} file). CSS content NOT included (use includeFullCSS=true if needed).`;

    return formatSuccessResponse(result, message);
  } catch (error) {
    return handleErrorWithContext(
      error,
      'get external CSS',
      { 
        url: validatedInput?.cssUrl,
        resource: 'external CSS file'
      }
    );
  }
}

function analyzeCSSContent(cssContent: string): CSSAnalysis {
  // Count CSS rules (approximate)
  const ruleMatches = cssContent.match(/\{[^}]*\}/g) || [];
  const totalRules = ruleMatches.length;

  // Count custom properties (CSS variables)
  const customPropertyMatches = cssContent.match(/--[\w-]+\s*:/g) || [];
  const customProperties = customPropertyMatches.length;

  // Count media queries
  const mediaQueryMatches = cssContent.match(/@media[^{]*\{/g) || [];
  const mediaQueries = mediaQueryMatches.length;

  // Count selectors (approximate)
  const selectorMatches = cssContent.match(/[^{}]+\{/g) || [];
  const selectors = selectorMatches.length;

  // Count declarations (approximate)
  const declarationMatches = cssContent.match(/[\w-]+\s*:[^;]+;/g) || [];
  const declarations = declarationMatches.length;

  return {
    totalRules,
    customProperties,
    mediaQueries,
    selectors,
    declarations,
  };
}

function formatBytes(bytes: number): string {
  if (bytes === 0) {
    return '0 Bytes';
  }
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
