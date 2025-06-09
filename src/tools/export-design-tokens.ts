import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { StorybookClient } from '../utils/storybook-client.js';
import { extractDesignTokens } from '../utils/html-parser.js';
import { handleError, formatTextResponse } from '../utils/error-handler.js';
import { validateExportDesignTokensInput } from '../utils/validators.js';
import { DesignToken } from '../types/storybook.js';

export const exportDesignTokensTool: Tool = {
  name: 'export_design_tokens',
  description: 'Extract and export design tokens from the Storybook CSS',
  inputSchema: {
    type: 'object',
    properties: {
      tokenTypes: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['color', 'spacing', 'typography', 'shadow', 'border', 'other']
        },
        description: 'Filter tokens by type (default: all types)'
      },
      format: {
        type: 'string',
        enum: ['json', 'css', 'scss'],
        description: 'Export format (default: json)'
      }
    },
    required: []
  }
};

export async function handleExportDesignTokens(input: any) {
  try {
    const validatedInput = validateExportDesignTokensInput(input);
    const client = new StorybookClient();
    
    const storiesIndex = await client.fetchStoriesIndex();
    const allTokens = new Map<string, DesignToken>();
    
    const stories = storiesIndex.stories || storiesIndex.entries || {};
    const storyIds = Object.keys(stories).slice(0, 5);
    
    for (const storyId of storyIds) {
      try {
        const componentHTML = await client.fetchComponentHTML(storyId);
        const cssContent = componentHTML.styles?.join('\n') || '';
        
        if (cssContent) {
          const tokens = extractDesignTokens(cssContent);
          tokens.forEach(token => {
            if (!validatedInput.tokenTypes || validatedInput.tokenTypes.includes(token.type)) {
              allTokens.set(token.name, token);
            }
          });
        }
      } catch (error) {
        console.error(`Failed to extract tokens from ${storyId}:`, error);
      }
    }
    
    const tokens = Array.from(allTokens.values()).sort((a, b) => a.name.localeCompare(b.name));
    const format = validatedInput.format || 'json';
    
    let output: string;
    
    switch (format) {
      case 'css':
        output = formatTokensAsCSS(tokens);
        break;
      case 'scss':
        output = formatTokensAsSCSS(tokens);
        break;
      case 'json':
      default:
        output = JSON.stringify(tokens, null, 2);
        break;
    }
    
    return formatTextResponse(`Exported ${tokens.length} design tokens in ${format} format:\n\n${output}`);
  } catch (error) {
    return handleError(error);
  }
}

function formatTokensAsCSS(tokens: DesignToken[]): string {
  const lines = [':root {'];
  
  tokens.forEach(token => {
    lines.push(`  ${token.name}: ${token.value};`);
  });
  
  lines.push('}');
  return lines.join('\n');
}

function formatTokensAsSCSS(tokens: DesignToken[]): string {
  const lines: string[] = [];
  
  tokens.forEach(token => {
    const scssVarName = token.name.replace(/^--/, '$').replace(/-/g, '_');
    lines.push(`${scssVarName}: ${token.value};`);
  });
  
  return lines.join('\n');
}