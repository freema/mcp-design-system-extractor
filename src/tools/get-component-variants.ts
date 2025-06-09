import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { StorybookClient } from '../utils/storybook-client.js';
import { handleError, formatSuccessResponse } from '../utils/error-handler.js';
import { validateGetComponentVariantsInput } from '../utils/validators.js';
import { ComponentVariant } from '../types/storybook.js';

export const getComponentVariantsTool: Tool = {
  name: 'get_component_variants',
  description: 'Get all story variants/states for a specific component. Returns all stories (variants) for a component with their IDs, names, and parameters. Component name should match exactly as shown in list_components (case-sensitive).',
  inputSchema: {
    type: 'object',
    properties: {
      componentName: {
        type: 'string',
        description: 'Exact name of the component as returned by list_components (e.g., "Button", "Input", "Card"). Case-sensitive matching.',
      },
    },
    required: ['componentName'],
  },
};

export async function handleGetComponentVariants(input: any) {
  try {
    const validatedInput = validateGetComponentVariantsInput(input);
    const client = new StorybookClient();

    const storiesIndex = await client.fetchStoriesIndex();
    const variants: ComponentVariant[] = [];

    const stories = storiesIndex.stories || storiesIndex.entries || {};
    Object.values(stories).forEach(story => {
      const componentName = story.title.split('/').pop() || story.title;

      if (componentName.toLowerCase() === validatedInput.componentName.toLowerCase()) {
        variants.push({
          id: story.id,
          name: story.name,
          ...(story.args && { args: story.args }),
          ...(story.parameters && { parameters: story.parameters }),
        });
      }
    });

    if (variants.length === 0) {
      return handleError(`No variants found for component: ${validatedInput.componentName}`);
    }

    return formatSuccessResponse(
      variants,
      `Found ${variants.length} variants for component: ${validatedInput.componentName}`
    );
  } catch (error) {
    return handleError(error);
  }
}
