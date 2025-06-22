import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { StorybookClient } from '../utils/storybook-client.js';
import { formatSuccessResponse, handleErrorWithContext } from '../utils/error-handler.js';
import { validateListComponentsInput } from '../utils/validators.js';
import { applyPagination, formatPaginationMessage } from '../utils/pagination.js';
import { mapStoriesToComponents, getComponentsArray } from '../utils/story-mapper.js';

export const listComponentsTool: Tool = {
  name: 'list_components',
  description:
    'List all UI components available in your design system/Storybook. Returns components like modals, dialogs, buttons, forms, cards, etc. with their names, categories, and stories. Use this to explore what components are available for building UI features. Use category="all" or omit category parameter to list all components. Supports pagination to handle large component libraries.',
  inputSchema: {
    type: 'object',
    properties: {
      category: {
        type: 'string',
        description:
          'Filter components by category path (e.g., "Components/Buttons", "Layout"). Use "all" or omit to list all components.',
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
    required: [],
  },
};

export async function handleListComponents(input: any) {
  let validatedInput: any;
  try {
    validatedInput = validateListComponentsInput(input);
    const client = new StorybookClient();

    const storiesIndex = await client.fetchStoriesIndex();

    if (!storiesIndex) {
      throw new Error(
        'Failed to fetch stories index - received null or undefined. Ensure Storybook is running and accessible at: ' +
          client.getStorybookUrl()
      );
    }

    // Support both v3 (stories) and v4 (entries) format
    const storiesData = storiesIndex.stories || storiesIndex.entries;

    if (!storiesData || typeof storiesData !== 'object') {
      throw new Error(
        `Invalid stories index structure. Expected object with 'stories' or 'entries' property, got: ${JSON.stringify(storiesIndex).substring(0, 200)}... Check if your Storybook instance is properly configured.`
      );
    }

    const stories = Object.values(storiesData);

    if (stories.length === 0) {
      return formatSuccessResponse(
        [],
        `No components found in Storybook at ${client.getStorybookUrl()}. Ensure your Storybook has stories configured and is accessible. Debug info: storiesData keys: ${Object.keys(storiesData).slice(0, 5).join(', ')}`
      );
    }

    const filterFn =
      validatedInput.category && validatedInput.category !== 'all'
        ? (_story: any, _componentName: string, category?: string) =>
            category === validatedInput.category
        : undefined;

    const componentMap = mapStoriesToComponents(storiesData, filterFn ? { filterFn } : {});
    const allComponents = getComponentsArray(componentMap);

    // Apply pagination
    const paginationResult = applyPagination(allComponents, {
      page: validatedInput.page,
      pageSize: validatedInput.pageSize,
    });

    const message = formatPaginationMessage(
      paginationResult,
      'Found',
      `filter: ${validatedInput.category || 'none'}`
    );

    return formatSuccessResponse(paginationResult.items, message);
  } catch (error) {
    return handleErrorWithContext(error, 'list components', {
      resource: 'components list',
    });
  }
}
