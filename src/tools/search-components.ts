import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { StorybookClient } from '../utils/storybook-client.js';
import { handleError, formatSuccessResponse } from '../utils/error-handler.js';
import { validateSearchComponentsInput } from '../utils/validators.js';
import { ComponentInfo } from '../types/storybook.js';

export const searchComponentsTool: Tool = {
  name: 'search_components',
  description: 'Search for components by name, title, or category',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query to match against component names, titles, or categories'
      },
      searchIn: {
        type: 'string',
        enum: ['name', 'title', 'category', 'all'],
        description: 'Where to search for the query (default: all)'
      }
    },
    required: ['query']
  }
};

export async function handleSearchComponents(input: any) {
  try {
    const validatedInput = validateSearchComponentsInput(input);
    const client = new StorybookClient();
    const searchIn = validatedInput.searchIn || 'all';
    const query = validatedInput.query.toLowerCase();
    
    const storiesIndex = await client.fetchStoriesIndex();
    const componentMap = new Map<string, ComponentInfo>();
    
    Object.values(storiesIndex.stories).forEach(story => {
      const componentName = story.title.split('/').pop() || story.title;
      const category = story.title.split('/').slice(0, -1).join('/') || '';
      
      let matches = false;
      
      switch (searchIn) {
        case 'name':
          matches = componentName.toLowerCase().includes(query);
          break;
        case 'title':
          matches = story.title.toLowerCase().includes(query);
          break;
        case 'category':
          matches = category.toLowerCase().includes(query);
          break;
        case 'all':
        default:
          matches = componentName.toLowerCase().includes(query) ||
                   story.title.toLowerCase().includes(query) ||
                   category.toLowerCase().includes(query);
          break;
      }
      
      if (matches) {
        if (!componentMap.has(componentName)) {
          componentMap.set(componentName, {
            id: story.id,
            name: componentName,
            title: story.title,
            category: category || undefined,
            stories: []
          });
        }
        
        componentMap.get(componentName)!.stories.push(story);
      }
    });
    
    const results = Array.from(componentMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    
    return formatSuccessResponse(results, `Found ${results.length} components matching "${validatedInput.query}"`);
  } catch (error) {
    return handleError(error);
  }
}