import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { StorybookClient } from '../utils/storybook-client.js';
import { handleError, formatSuccessResponse } from '../utils/error-handler.js';
import { validateSearchComponentsInput } from '../utils/validators.js';
import { ComponentInfo } from '../types/storybook.js';

export const searchComponentsTool: Tool = {
  name: 'search_components',
  description:
    'Search design system components by name, title, or category. Find UI components like modals, dialogs, popups, overlays, buttons, forms, cards, etc. Name is the component name only (e.g., "Modal", "Dialog"), title is the full story path (e.g., "Components/Overlays/Modal"), category is the grouping (e.g., "Components/Overlays"). Use "*" as query to list all components. Supports pagination for large result sets.',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description:
          'The search query to match (e.g., "button", "form", "nav"). Use "*" to list all components. Case-insensitive partial matching.',
      },
      searchIn: {
        type: 'string',
        enum: ['name', 'title', 'category', 'all'],
        description:
          'Where to search: "name" (component name only), "title" (full path), "category" (grouping), or "all" (search everywhere, default)',
      },
      page: {
        type: 'number',
        description: 'Page number (1-based). Default is 1.',
      },
      pageSize: {
        type: 'number',
        description: 'Number of components per page (1-100). Default is 50.',
      },
    },
    required: ['query'],
  },
};

export async function handleSearchComponents(input: any) {
  try {
    const validatedInput = validateSearchComponentsInput(input);
    const client = new StorybookClient();
    const searchIn = validatedInput.searchIn || 'all';
    const query = validatedInput.query.toLowerCase();

    // Handle wildcard queries - if query is just "*" or empty, match everything
    const isWildcard = query === '*' || query === '' || query === '.*';

    const storiesIndex = await client.fetchStoriesIndex();
    const componentMap = new Map<string, ComponentInfo>();

    const stories = storiesIndex.stories || storiesIndex.entries || {};
    Object.values(stories).forEach(story => {
      const componentName = story.title.split('/').pop() || story.title;
      const categoryParts = story.title.split('/').slice(0, -1);
      const category = categoryParts.length > 0 ? categoryParts.join('/') : undefined;

      let matches = false;

      switch (searchIn) {
        case 'name':
          matches = isWildcard || componentName.toLowerCase().includes(query);
          break;
        case 'title':
          matches = isWildcard || story.title.toLowerCase().includes(query);
          break;
        case 'category':
          matches = isWildcard || (category ? category.toLowerCase().includes(query) : false);
          break;
        case 'all':
        default:
          matches =
            isWildcard ||
            componentName.toLowerCase().includes(query) ||
            story.title.toLowerCase().includes(query) ||
            Boolean(category && category.toLowerCase().includes(query));
          break;
      }

      if (matches) {
        if (!componentMap.has(componentName)) {
          const componentInfo: ComponentInfo = {
            id: story.id,
            name: componentName,
            title: story.title,
            stories: [],
          };

          if (category) {
            componentInfo.category = category;
          }

          componentMap.set(componentName, componentInfo);
        }

        componentMap.get(componentName)!.stories.push(story);
      }
    });

    const allResults = Array.from(componentMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    // Apply pagination
    const page = validatedInput.page || 1;
    const pageSize = validatedInput.pageSize || 50;
    const totalResults = allResults.length;
    const totalPages = Math.ceil(totalResults / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalResults);

    // Validate page number
    if (page > totalPages && totalResults > 0) {
      throw new Error(
        `Page ${page} exceeds total pages (${totalPages}). Please use a page number between 1 and ${totalPages}.`
      );
    }

    const results = allResults.slice(startIndex, endIndex);

    return formatSuccessResponse(
      results,
      `Found ${totalResults} components matching "${validatedInput.query}" (showing page ${page}/${totalPages}, ${results.length} items, searched in: ${searchIn})`
    );
  } catch (error) {
    return handleError(error);
  }
}
