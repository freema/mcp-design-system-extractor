import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { StorybookClient } from '../utils/storybook-client.js';
import { handleError, formatSuccessResponse } from '../utils/error-handler.js';
import { validateListComponentsInput } from '../utils/validators.js';
import { ComponentInfo } from '../types/storybook.js';

export const listComponentsTool: Tool = {
  name: 'list_components',
  description: 'List all available components from the Storybook instance',
  inputSchema: {
    type: 'object',
    properties: {
      category: {
        type: 'string',
        description: 'Filter components by category (optional)'
      }
    },
    required: []
  }
};

export async function handleListComponents(input: any) {
  try {
    const validatedInput = validateListComponentsInput(input);
    const client = new StorybookClient();
    
    const storiesIndex = await client.fetchStoriesIndex();
    const componentMap = new Map<string, ComponentInfo>();
    
    Object.values(storiesIndex.stories).forEach(story => {
      const componentName = story.title.split('/').pop() || story.title;
      const categoryParts = story.title.split('/').slice(0, -1);
      const category = categoryParts.length > 0 ? categoryParts.join('/') : undefined;
      
      if (validatedInput.category && category !== validatedInput.category) {
        return;
      }
      
      if (!componentMap.has(componentName)) {
        const componentInfo: ComponentInfo = {
          id: story.id,
          name: componentName,
          title: story.title,
          stories: []
        };
        
        if (category) {
          componentInfo.category = category;
        }
        
        componentMap.set(componentName, componentInfo);
      }
      
      componentMap.get(componentName)!.stories.push(story);
    });
    
    const components = Array.from(componentMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    
    return formatSuccessResponse(components, `Found ${components.length} components`);
  } catch (error) {
    return handleError(error);
  }
}