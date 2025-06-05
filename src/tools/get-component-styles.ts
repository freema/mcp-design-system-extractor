import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { StorybookClient } from '../utils/storybook-client.js';
import { extractComponentStyles } from '../utils/html-parser.js';
import { handleError, formatSuccessResponse } from '../utils/error-handler.js';
import { validateGetComponentStylesInput } from '../utils/validators.js';

export const getComponentStylesTool: Tool = {
  name: 'get_component_styles',
  description: 'Extract CSS classes, inline styles, and design tokens from a component',
  inputSchema: {
    type: 'object',
    properties: {
      componentId: {
        type: 'string',
        description: 'The story ID of the component'
      },
      extractCustomProperties: {
        type: 'boolean',
        description: 'Whether to extract CSS custom properties (design tokens) (default: true)'
      }
    },
    required: ['componentId']
  }
};

export async function handleGetComponentStyles(input: any) {
  try {
    const validatedInput = validateGetComponentStylesInput(input);
    const client = new StorybookClient();
    
    const componentHTML = await client.fetchComponentHTML(validatedInput.componentId);
    const styles = extractComponentStyles(componentHTML.html, componentHTML.styles);
    
    styles.storyId = validatedInput.componentId;
    
    const response = {
      storyId: styles.storyId,
      cssRules: styles.cssRules,
      inlineStyles: styles.inlineStyles,
      classNames: styles.classNames,
      ...(validatedInput.extractCustomProperties !== false && { customProperties: styles.customProperties })
    };
    
    return formatSuccessResponse(response, `Extracted styles for component: ${validatedInput.componentId}`);
  } catch (error) {
    return handleError(error);
  }
}