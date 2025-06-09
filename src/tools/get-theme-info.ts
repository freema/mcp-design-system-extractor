import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { StorybookClient } from '../utils/storybook-client.js';
import { handleError, formatSuccessResponse } from '../utils/error-handler.js';
import { validateGetThemeInfoInput } from '../utils/validators.js';
import { ThemeInfo } from '../types/storybook.js';
import { extractDesignTokens } from '../utils/html-parser.js';

export const getThemeInfoTool: Tool = {
  name: 'get_theme_info',
  description: 'Get design system theme information (colors, spacing, typography, breakpoints)',
  inputSchema: {
    type: 'object',
    properties: {
      includeAll: {
        type: 'boolean',
        description: 'Whether to include all CSS custom properties found (default: false)',
      },
    },
  },
};

export async function handleGetThemeInfo(input: any) {
  try {
    const validatedInput = validateGetThemeInfoInput(input);
    const includeAll = validatedInput.includeAll || false;
    const client = new StorybookClient();

    // Try to find a theme or foundation story
    const index = await client.fetchStoriesIndex();
    const stories = index.stories || index.entries;

    if (!stories) {
      throw new Error('No stories found in Storybook index');
    }

    // Look for theme-related stories
    const themePatterns = [
      /theme/i,
      /design.*tokens/i,
      /foundation/i,
      /colors?/i,
      /typography/i,
      /spacing/i,
      /palette/i,
    ];

    let themeStoryId: string | null = null;

    for (const [storyId, story] of Object.entries(stories)) {
      const title = story.title || '';
      const name = story.name || story.story || '';

      if (themePatterns.some(pattern => pattern.test(title) || pattern.test(name))) {
        themeStoryId = storyId;
        break;
      }
    }

    // If no theme story found, try to get any story to extract theme info
    if (!themeStoryId) {
      const firstStoryKey = Object.keys(stories)[0];
      themeStoryId = firstStoryKey || null;
    }

    if (!themeStoryId) {
      throw new Error('No stories available to extract theme information');
    }

    // Fetch the HTML and styles
    const componentHTML = await client.fetchComponentHTML(themeStoryId);

    // Extract all CSS custom properties
    const allTokens: Record<string, string> = {};

    // Extract from styles
    if (componentHTML.styles) {
      for (const style of componentHTML.styles) {
        const tokens = extractDesignTokens(style);
        tokens.forEach(token => {
          allTokens[token.name] = token.value;
        });
      }
    }

    // Extract from inline styles in HTML
    const styleRegex = /style="([^"]*)"/g;
    let match;
    while ((match = styleRegex.exec(componentHTML.html)) !== null) {
      if (match[1]) {
        const inlineStyle = match[1];
        const tokens = extractDesignTokens(inlineStyle);
        tokens.forEach(token => {
          allTokens[token.name] = token.value;
        });
      }
    }

    // Organize tokens into theme categories
    const theme: ThemeInfo = {
      colors: {},
      spacing: {},
      typography: {},
      breakpoints: {},
      shadows: {},
      radii: {},
    };

    // Categorize tokens
    for (const [name, value] of Object.entries(allTokens)) {
      const lowerName = name.toLowerCase();

      if (
        lowerName.includes('color') ||
        lowerName.includes('bg') ||
        lowerName.includes('text') ||
        lowerName.includes('border') ||
        isColorValue(value)
      ) {
        theme.colors[name] = value;
      } else if (
        lowerName.includes('space') ||
        lowerName.includes('spacing') ||
        lowerName.includes('margin') ||
        lowerName.includes('padding') ||
        lowerName.includes('gap') ||
        isSpacingValue(value)
      ) {
        theme.spacing[name] = value;
      } else if (
        lowerName.includes('font') ||
        lowerName.includes('text') ||
        lowerName.includes('line') ||
        lowerName.includes('letter')
      ) {
        theme.typography[name] = value;
      } else if (
        lowerName.includes('breakpoint') ||
        lowerName.includes('screen') ||
        lowerName.includes('media')
      ) {
        theme.breakpoints[name] = value;
      } else if (lowerName.includes('shadow') || lowerName.includes('elevation')) {
        theme.shadows[name] = value;
      } else if (lowerName.includes('radius') || lowerName.includes('rounded')) {
        theme.radii[name] = value;
      } else if (includeAll) {
        // If includeAll is true, add uncategorized tokens to a special category
        if (!(theme as any).other) {
          (theme as any).other = {};
        }
        (theme as any).other[name] = value;
      }
    }

    // Add common breakpoint values if not found
    if (Object.keys(theme.breakpoints).length === 0) {
      theme.breakpoints = {
        '--breakpoint-xs': '0px',
        '--breakpoint-sm': '600px',
        '--breakpoint-md': '960px',
        '--breakpoint-lg': '1280px',
        '--breakpoint-xl': '1920px',
      };
    }

    const response = {
      theme,
      totalTokens: Object.keys(allTokens).length,
      sourceStoryId: themeStoryId,
    };

    return formatSuccessResponse(
      response,
      `Extracted ${Object.keys(allTokens).length} design tokens`
    );
  } catch (error) {
    return handleError(error);
  }
}

function isColorValue(value: string): boolean {
  const colorPatterns = [
    /^#[0-9a-f]{3,8}$/i,
    /^rgb/i,
    /^hsl/i,
    /^(red|blue|green|yellow|black|white|gray|grey)/i,
  ];

  return colorPatterns.some(pattern => pattern.test(value));
}

function isSpacingValue(value: string): boolean {
  return /^\d+(\.\d+)?(px|rem|em|vh|vw|%)$/.test(value);
}
