import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { StorybookClient } from '../utils/storybook-client.js';
import { handleError, formatSuccessResponse } from '../utils/error-handler.js';
import { validateGetComponentHTMLInput } from '../utils/validators.js';

export const getComponentHTMLTool: Tool = {
  name: 'get_component_html',
  description: 'Extract HTML from a specific component story in Storybook',
  inputSchema: {
    type: 'object',
    properties: {
      componentId: {
        type: 'string',
        description: 'The story ID of the component (e.g., "example-button--primary")'
      },
      includeStyles: {
        type: 'boolean',
        description: 'Whether to include extracted styles in the response (default: false)'
      }
    },
    required: ['componentId']
  }
};

export async function handleGetComponentHTML(input: any) {
  try {
    const validatedInput = validateGetComponentHTMLInput(input);
    const client = new StorybookClient();
    
    // Add timeout wrapper
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Operation timed out after 8 seconds')), 8000)
    );
    
    const componentHTML = await Promise.race([
      client.fetchComponentHTML(validatedInput.componentId),
      timeoutPromise
    ]) as ComponentHTML;
    
    const response = {
      storyId: componentHTML.storyId,
      html: componentHTML.html,
      classes: componentHTML.classes,
      ...(validatedInput.includeStyles && { styles: componentHTML.styles })
    };
    
    return formatSuccessResponse(response, `Extracted HTML for component: ${validatedInput.componentId}`);
  } catch (error) {
    return handleError(error);
  }
}