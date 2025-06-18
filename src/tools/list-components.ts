import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { StorybookClient } from '../utils/storybook-client.js';
import { handleError, formatSuccessResponse } from '../utils/error-handler.js';
import { validateListComponentsInput } from '../utils/validators.js';
import { ComponentInfo } from '../types/storybook.js';

export const listComponentsTool: Tool = {
  name: 'list_components',
  description:
    'List all available components from the Storybook instance. Returns a list of components with their names, categories, and associated stories. Requires a running Storybook instance accessible via STORYBOOK_URL environment variable. Use category="all" or omit category parameter to list all components. To see available categories, call this tool first with no parameters.',
  inputSchema: {
    type: 'object',
    properties: {
      category: {
        type: 'string',
        description:
          'Filter components by category path (e.g., "Components/Buttons", "Layout"). Use "all" or omit to list all components.',
      },
    },
    required: [],
  },
};

export async function handleListComponents(input: any) {
  try {
    const validatedInput = validateListComponentsInput(input);
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

    const componentMap = new Map<string, ComponentInfo>();
    const stories = Object.values(storiesData);

    if (stories.length === 0) {
      return formatSuccessResponse(
        [],
        `No components found in Storybook at ${client.getStorybookUrl()}. Ensure your Storybook has stories configured and is accessible. Debug info: storiesData keys: ${Object.keys(storiesData).slice(0, 5).join(', ')}`
      );
    }

    stories.forEach(story => {
      const componentName = story.title.split('/').pop() || story.title;
      const categoryParts = story.title.split('/').slice(0, -1);
      const category = categoryParts.length > 0 ? categoryParts.join('/') : undefined;

      if (
        validatedInput.category &&
        validatedInput.category !== 'all' &&
        category !== validatedInput.category
      ) {
        return;
      }

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
    });

    const components = Array.from(componentMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    return formatSuccessResponse(
      components,
      `Found ${components.length} components (processed ${stories.length} stories, filter: ${validatedInput.category || 'none'})`
    );
  } catch (error) {
    return handleError(error);
  }
}
