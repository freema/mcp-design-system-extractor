import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { StorybookClient } from '../utils/storybook-client.js';
import { handleError, formatSuccessResponse } from '../utils/error-handler.js';
import { validateGetComponentVariantsInput } from '../utils/validators.js';
import { ComponentVariant } from '../types/storybook.js';

export const getComponentVariantsTool: Tool = {
  name: 'get_component_variants',
  description: 'Get all story variants for a specific component',
  inputSchema: {
    type: 'object',
    properties: {
      componentName: {
        type: 'string',
        description: 'The name of the component to get variants for'
      }
    },
    required: ['componentName']
  }
};

export async function handleGetComponentVariants(input: any) {
  try {
    const validatedInput = validateGetComponentVariantsInput(input);
    const client = new StorybookClient();
    
    const storiesIndex = await client.fetchStoriesIndex();
    const variants: ComponentVariant[] = [];
    
    Object.values(storiesIndex.stories).forEach(story => {
      const componentName = story.title.split('/').pop() || story.title;
      
      if (componentName.toLowerCase() === validatedInput.componentName.toLowerCase()) {
        variants.push({
          id: story.id,
          name: story.name,
          args: story.args,
          parameters: story.parameters
        });
      }
    });
    
    if (variants.length === 0) {
      return handleError(`No variants found for component: ${validatedInput.componentName}`);
    }
    
    return formatSuccessResponse(variants, `Found ${variants.length} variants for component: ${validatedInput.componentName}`);
  } catch (error) {
    return handleError(error);
  }
}