import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { StorybookClient } from '../utils/storybook-client.js';
import { handleError, formatSuccessResponse, handleErrorWithContext } from '../utils/error-handler.js';
import { validateSearchComponentsInput } from '../utils/validators.js';
import { applyPagination, formatPaginationMessage } from '../utils/pagination.js';
import { mapStoriesToComponents, getComponentsArray } from '../utils/story-mapper.js';

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
    const stories = storiesIndex.stories || storiesIndex.entries || {};

    const filterFn = (story: any, componentName: string, category?: string) => {
      const storyTitle = story.title || '';
      const categoryParts = storyTitle.split('/').slice(0, -1);
      const storyCategory = categoryParts.length > 0 ? categoryParts.join('/') : undefined;

      if (isWildcard) return true;

      switch (searchIn) {
        case 'name':
          return componentName.toLowerCase().includes(query);
        case 'title':
          return storyTitle.toLowerCase().includes(query);
        case 'category':
          return storyCategory ? storyCategory.toLowerCase().includes(query) : false;
        case 'all':
        default:
          return (
            componentName.toLowerCase().includes(query) ||
            storyTitle.toLowerCase().includes(query) ||
            Boolean(storyCategory && storyCategory.toLowerCase().includes(query))
          );
      }
    };

    const componentMap = mapStoriesToComponents(stories, { filterFn });
    const allResults = getComponentsArray(componentMap);

    // Apply pagination
    const paginationResult = applyPagination(allResults, {
      page: validatedInput.page,
      pageSize: validatedInput.pageSize,
    });

    const message = formatPaginationMessage(
      paginationResult,
      'Found',
      `matching "${validatedInput.query}", searched in: ${searchIn}`
    );

    return formatSuccessResponse(paginationResult.items, message);
  } catch (error) {
    return handleErrorWithContext(
      error,
      'search components',
      { 
        resource: 'component search results'
      }
    );
  }
}
