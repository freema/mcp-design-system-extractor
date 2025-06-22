import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { StorybookClient } from '../utils/storybook-client.js';
import { handleError, formatSuccessResponse, handleErrorWithContext } from '../utils/error-handler.js';
import { validateGetComponentHTMLInput } from '../utils/validators.js';
import { ComponentHTML } from '../types/storybook.js';
import { createTimeoutError } from '../utils/error-formatter.js';
import { OPERATION_TIMEOUTS, getEnvironmentTimeout } from '../utils/timeout-constants.js';

export const getComponentHTMLTool: Tool = {
  name: 'get_component_html',
  description:
    'Extract HTML from a specific component story in Storybook. Requires a story ID (format: "component-name--story-name", e.g., "button--primary", "forms-input--default"). Use list_components or get_component_variants first to find valid story IDs.',
  inputSchema: {
    type: 'object',
    properties: {
      componentId: {
        type: 'string',
        description:
          'The story ID in format "component-name--story-name" (e.g., "button--primary", "forms-input--default"). Get this from list_components or get_component_variants.',
      },
      includeStyles: {
        type: 'boolean',
        description:
          'Whether to include extracted CSS styles in the response (useful for understanding component styling)',
      },
    },
    required: ['componentId'],
  },
};

export async function handleGetComponentHTML(input: any) {
  try {
    const validatedInput = validateGetComponentHTMLInput(input);
    const client = new StorybookClient();

    const timeout = getEnvironmentTimeout(OPERATION_TIMEOUTS.fetchComponentHTML);
    
    // Add timeout wrapper
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        const timeoutError = createTimeoutError(
          'get component HTML',
          timeout,
          undefined,
          `component ${validatedInput.componentId}`
        );
        reject(new Error(timeoutError.message));
      }, timeout);
    });

    const componentHTML = (await Promise.race([
      client.fetchComponentHTML(validatedInput.componentId),
      timeoutPromise,
    ])) as ComponentHTML;

    const response = {
      storyId: componentHTML.storyId,
      html: componentHTML.html,
      classes: componentHTML.classes,
      ...(validatedInput.includeStyles && { styles: componentHTML.styles }),
    };

    return formatSuccessResponse(
      response,
      `Extracted HTML for component: ${validatedInput.componentId}`
    );
  } catch (error) {
    return handleErrorWithContext(
      error,
      'get component HTML',
      { 
        storyId: validatedInput?.componentId,
        resource: 'component HTML'
      }
    );
  }
}
