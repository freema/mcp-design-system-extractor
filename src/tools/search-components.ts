import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { StorybookClient } from '../utils/storybook-client.js';
import { formatSuccessResponse, handleErrorWithContext } from '../utils/error-handler.js';
import { validateSearchComponentsInput } from '../utils/validators.js';
import { applyPagination, formatPaginationMessage } from '../utils/pagination.js';
import { mapStoriesToComponents, getComponentsArray } from '../utils/story-mapper.js';

/**
 * Predefined purpose patterns for semantic component search
 */
const PURPOSE_PATTERNS: Record<string, { patterns: RegExp[]; description: string }> = {
  'form inputs': {
    patterns: [
      /input/i,
      /textfield/i,
      /textarea/i,
      /select/i,
      /dropdown/i,
      /checkbox/i,
      /radio/i,
      /switch/i,
      /toggle/i,
      /slider/i,
      /datepicker/i,
      /timepicker/i,
      /form/i,
      /field/i,
    ],
    description: 'Components for collecting user input in forms',
  },
  navigation: {
    patterns: [
      /nav/i,
      /menu/i,
      /breadcrumb/i,
      /tabs?/i,
      /stepper/i,
      /pagination/i,
      /link/i,
      /sidebar/i,
      /drawer/i,
      /appbar/i,
      /toolbar/i,
      /header/i,
    ],
    description: 'Components for navigating through the application',
  },
  feedback: {
    patterns: [
      /alert/i,
      /snackbar/i,
      /toast/i,
      /notification/i,
      /message/i,
      /error/i,
      /warning/i,
      /success/i,
      /info/i,
      /banner/i,
      /dialog/i,
      /modal/i,
      /popup/i,
      /tooltip/i,
      /popover/i,
    ],
    description: 'Components for providing feedback to users',
  },
  'data display': {
    patterns: [
      /table/i,
      /datagrid/i,
      /list/i,
      /card/i,
      /chip/i,
      /badge/i,
      /avatar/i,
      /image/i,
      /icon/i,
      /typography/i,
      /text/i,
      /label/i,
      /tag/i,
    ],
    description: 'Components for displaying data and content',
  },
  layout: {
    patterns: [
      /grid/i,
      /container/i,
      /box/i,
      /stack/i,
      /flex/i,
      /spacer/i,
      /divider/i,
      /layout/i,
      /panel/i,
      /section/i,
      /wrapper/i,
      /column/i,
      /row/i,
    ],
    description: 'Components for structuring and laying out content',
  },
  buttons: {
    patterns: [/button/i, /fab/i, /icon.*button/i, /action/i, /cta/i],
    description: 'Interactive button components',
  },
  progress: {
    patterns: [
      /progress/i,
      /loading/i,
      /spinner/i,
      /skeleton/i,
      /loader/i,
      /circular.*progress/i,
      /linear.*progress/i,
    ],
    description: 'Components for showing loading and progress states',
  },
  media: {
    patterns: [
      /image/i,
      /video/i,
      /audio/i,
      /media/i,
      /gallery/i,
      /carousel/i,
      /slider/i,
      /player/i,
    ],
    description: 'Components for displaying media content',
  },
};

export const searchComponentsTool: Tool = {
  name: 'search_components',
  description:
    'Search design system components by name, title, category, or purpose. Find UI components like modals, dialogs, buttons, forms, cards, etc. Supports text search (query) and semantic search by purpose. Available purposes: "form inputs", "navigation", "feedback", "data display", "layout", "buttons", "progress", "media". Supports pagination for large result sets.',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description:
          'Text search query (e.g., "button", "form", "nav"). Use "*" to list all. Case-insensitive partial matching. Optional if purpose is provided.',
      },
      purpose: {
        type: 'string',
        description:
          'Semantic search by purpose. Available: "form inputs", "navigation", "feedback", "data display", "layout", "buttons", "progress", "media". Can be combined with query.',
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
        description: 'Number of components per page (1-100). Default is 20.',
      },
    },
    required: [],
  },
};

/**
 * Get purpose patterns - either from predefined or create from purpose string
 */
function getPurposePatterns(purpose: string): { patterns: RegExp[]; description: string } {
  const purposeLower = purpose.toLowerCase();

  if (PURPOSE_PATTERNS[purposeLower]) {
    return PURPOSE_PATTERNS[purposeLower];
  }

  // Create patterns from the purpose string
  const words = purposeLower.split(/\s+/);
  return {
    patterns: words.map((word: string) => new RegExp(word, 'i')),
    description: `Components related to ${purpose}`,
  };
}

export async function handleSearchComponents(input: any) {
  try {
    const validatedInput = validateSearchComponentsInput(input);
    const client = new StorybookClient();
    const searchIn = validatedInput.searchIn || 'all';
    const query = (validatedInput.query || '').toLowerCase();
    const purpose = validatedInput.purpose;

    // Require at least query or purpose
    if (!query && !purpose) {
      throw new Error('At least one of "query" or "purpose" parameter is required');
    }

    // Handle wildcard queries
    const isWildcard = query === '*' || query === '.*';
    const hasTextQuery = query && !isWildcard;

    // Get purpose patterns if specified
    const purposeConfig = purpose ? getPurposePatterns(purpose) : null;

    const storiesIndex = await client.fetchStoriesIndex();
    const stories = storiesIndex.stories || storiesIndex.entries || {};

    const filterFn = (story: any, componentName: string, _category?: string) => {
      const storyTitle = story.title || '';
      const storyName = story.name || story.story || '';
      const categoryParts = storyTitle.split('/').slice(0, -1);
      const storyCategory = categoryParts.length > 0 ? categoryParts.join('/') : undefined;

      // Check purpose patterns
      let matchesPurpose = true;
      if (purposeConfig) {
        matchesPurpose = purposeConfig.patterns.some(
          pattern =>
            pattern.test(storyTitle) || pattern.test(storyName) || pattern.test(componentName)
        );
      }

      // Check text query
      let matchesQuery = true;
      if (hasTextQuery) {
        switch (searchIn) {
          case 'name':
            matchesQuery = componentName.toLowerCase().includes(query);
            break;
          case 'title':
            matchesQuery = storyTitle.toLowerCase().includes(query);
            break;
          case 'category':
            matchesQuery = storyCategory ? storyCategory.toLowerCase().includes(query) : false;
            break;
          case 'all':
          default:
            matchesQuery =
              componentName.toLowerCase().includes(query) ||
              storyTitle.toLowerCase().includes(query) ||
              Boolean(storyCategory?.toLowerCase().includes(query));
        }
      }

      // Both conditions must match (AND logic)
      return matchesPurpose && matchesQuery;
    };

    const componentMap = mapStoriesToComponents(stories, { filterFn });
    const allResults = getComponentsArray(componentMap);

    // Apply pagination
    const paginationResult = applyPagination(allResults, {
      page: validatedInput.page,
      pageSize: validatedInput.pageSize,
    });

    // Build search description
    const searchDesc = [];
    if (hasTextQuery) {
      searchDesc.push(`query: "${query}"`);
    }
    if (purpose) {
      searchDesc.push(`purpose: "${purpose}"`);
    }
    if (!hasTextQuery && !purpose && isWildcard) {
      searchDesc.push('all components');
    }

    const message = formatPaginationMessage(
      paginationResult,
      'Found',
      `${searchDesc.join(', ')}, searched in: ${searchIn}`
    );

    // Include purpose description if searching by purpose
    const response = purposeConfig
      ? { description: purposeConfig.description, components: paginationResult.items }
      : paginationResult.items;

    return formatSuccessResponse(response, message, {
      components: paginationResult.items,
      ...(purposeConfig && { description: purposeConfig.description }),
      pagination: {
        page: paginationResult.page,
        pageSize: paginationResult.pageSize,
        totalItems: paginationResult.totalItems,
        totalPages: paginationResult.totalPages,
      },
    });
  } catch (error) {
    return handleErrorWithContext(error, 'search components', {
      resource: 'component search results',
    });
  }
}
