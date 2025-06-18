import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { StorybookClient } from '../utils/storybook-client.js';
import { handleError, formatSuccessResponse } from '../utils/error-handler.js';
import { validateGetComponentPropsInput } from '../utils/validators.js';
import { ComponentProps, PropDefinition } from '../types/storybook.js';

export const getComponentPropsTool: Tool = {
  name: 'get_component_props',
  description:
    "Extract component props/API documentation from Storybook's argTypes configuration, including prop names, types, default values, required status, and control options",
  inputSchema: {
    type: 'object',
    properties: {
      componentId: {
        type: 'string',
        description: 'The story ID of the component (e.g., "example-button--primary")',
      },
    },
    required: ['componentId'],
  },
};

export async function handleGetComponentProps(input: any) {
  try {
    const validatedInput = validateGetComponentPropsInput(input);
    const client = new StorybookClient();

    // Get the story index first
    const index = await client.fetchStoriesIndex();
    const stories = index.stories || index.entries;

    if (!stories?.[validatedInput.componentId]) {
      throw new Error(`Component with ID "${validatedInput.componentId}" not found`);
    }

    const story = stories[validatedInput.componentId]!;
    const argTypes = story.argTypes || {};
    const args = story.args || {};

    // Extract props from argTypes
    const props: Record<string, PropDefinition> = {};

    for (const [propName, argType] of Object.entries(argTypes)) {
      const prop: PropDefinition = {
        name: propName,
        type: argType.type?.name || 'unknown',
        required: argType.type?.required || false,
        defaultValue: args[propName] !== undefined ? args[propName] : argType.defaultValue,
        description: argType.description || '',
      };

      // Add control information if available
      if (argType.control) {
        prop.control = {
          type: argType.control.type || 'text',
          options: argType.control.options || argType.options,
        };
      }

      props[propName] = prop;
    }

    const componentProps: ComponentProps = {
      storyId: validatedInput.componentId,
      props,
      defaultProps: args,
    };

    return formatSuccessResponse(
      componentProps,
      `Retrieved props for component: ${validatedInput.componentId}`
    );
  } catch (error) {
    return handleError(error);
  }
}
