import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { StorybookClient } from '../utils/storybook-client.js';
import { handleError, formatSuccessResponse, handleErrorWithContext } from '../utils/error-handler.js';
import { validateGetComponentByPurposeInput } from '../utils/validators.js';
import { ComponentByPurpose } from '../types/storybook.js';
import { applyPagination, formatPaginationMessage } from '../utils/pagination.js';
import { mapStoriesToComponents, getComponentsArray } from '../utils/story-mapper.js';

export const getComponentByPurposeTool: Tool = {
  name: 'get_component_by_purpose',
  description:
    'Find design system components by their purpose or use case. Available purposes: "form inputs" (input fields, selects, checkboxes), "navigation" (menus, breadcrumbs, tabs), "feedback" (alerts, toasts, modals, dialogs, popups), "data display" (tables, cards, lists), "layout" (grids, containers, dividers), "buttons" (all button types), "progress" (loaders, spinners), "media" (images, videos, carousels). Use this when looking for components to build specific UI features. Supports pagination for large result sets.',
  inputSchema: {
    type: 'object',
    properties: {
      purpose: {
        type: 'string',
        description:
          'The purpose to search for (e.g., "form inputs", "navigation", "feedback", "data display")',
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
    required: ['purpose'],
  },
};

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

export async function handleGetComponentByPurpose(input: any) {
  try {
    const validatedInput = validateGetComponentByPurposeInput(input);
    const purposeLower = validatedInput.purpose.toLowerCase();
    const client = new StorybookClient();

    // Fetch all components
    const index = await client.fetchStoriesIndex();
    const stories = index.stories || index.entries;

    if (!stories) {
      throw new Error('No stories found in Storybook index');
    }

    // Find matching purpose patterns
    let patterns: RegExp[] = [];
    let description = '';

    // Check predefined purposes
    if (PURPOSE_PATTERNS[purposeLower]) {
      patterns = PURPOSE_PATTERNS[purposeLower].patterns;
      description = PURPOSE_PATTERNS[purposeLower].description;
    } else {
      // Create patterns from the purpose string
      const words = purposeLower.split(/\s+/);
      patterns = words.map(word => new RegExp(word, 'i'));
      description = `Components related to ${validatedInput.purpose}`;
    }

    // Create filter function for purpose matching
    const filterFn = (story: any, componentName: string) => {
      const componentTitle = story.title || '';
      const storyName = story.name || story.story || '';
      
      return patterns.some(
        pattern =>
          pattern.test(componentTitle) || pattern.test(storyName) || pattern.test(componentName)
      );
    };

    const componentMap = mapStoriesToComponents(stories, { 
      filterFn,
      useComponentKey: 'title'
    });
    const allComponents = getComponentsArray(componentMap);

    // Apply pagination
    const paginationResult = applyPagination(allComponents, {
      page: validatedInput.page,
      pageSize: validatedInput.pageSize,
    });

    const result: ComponentByPurpose = {
      purpose: validatedInput.purpose,
      components: paginationResult.items,
      description,
    };

    const message = formatPaginationMessage(
      paginationResult,
      'Found',
      `for purpose: ${validatedInput.purpose}`
    );

    return formatSuccessResponse(result, message);
  } catch (error) {
    return handleErrorWithContext(
      error,
      'get components by purpose',
      { 
        resource: 'components by purpose'
      }
    );
  }
}
