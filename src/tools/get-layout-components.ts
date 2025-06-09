import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { StorybookClient } from '../utils/storybook-client.js';
import { handleError, formatSuccessResponse } from '../utils/error-handler.js';
import { validateGetLayoutComponentsInput } from '../utils/validators.js';
import { ComponentInfo } from '../types/storybook.js';

export const getLayoutComponentsTool: Tool = {
  name: 'get_layout_components',
  description: 'Get all layout components (Grid, Container, Stack, Box) with usage examples',
  inputSchema: {
    type: 'object',
    properties: {
      includeExamples: {
        type: 'boolean',
        description: 'Whether to include HTML examples for each layout component (default: true)',
      },
    },
  },
};

export async function handleGetLayoutComponents(input: any) {
  try {
    const validatedInput = validateGetLayoutComponentsInput(input);
    const includeExamples = validatedInput.includeExamples !== false; // default true
    const client = new StorybookClient();

    // Fetch all components
    const index = await client.fetchStoriesIndex();
    const stories = index.stories || index.entries;

    if (!stories) {
      throw new Error('No stories found in Storybook index');
    }

    // Common layout component patterns
    const layoutPatterns = [
      /grid/i,
      /container/i,
      /stack/i,
      /box/i,
      /layout/i,
      /flex/i,
      /spacer/i,
      /divider/i,
      /row/i,
      /col(umn)?/i,
      /wrapper/i,
      /section/i,
      /panel/i,
    ];

    // Group stories by component
    const componentMap = new Map<string, ComponentInfo>();
    const layoutComponents: ComponentInfo[] = [];

    for (const [storyId, story] of Object.entries(stories)) {
      const componentTitle = story.title || '';
      const storyName = story.name || story.story || '';

      // Check if this is a layout component
      const isLayoutComponent = layoutPatterns.some(
        pattern => pattern.test(componentTitle) || pattern.test(storyName)
      );

      if (isLayoutComponent) {
        const componentKey = componentTitle.toLowerCase();

        if (!componentMap.has(componentKey)) {
          const componentInfo: ComponentInfo = {
            id: storyId.split('--')[0] || storyId,
            name: componentTitle?.split('/').pop() || componentTitle || 'Unknown',
            title: componentTitle || 'Unknown',
            category: 'layout',
            stories: [],
          };
          componentMap.set(componentKey, componentInfo);
          layoutComponents.push(componentInfo);
        }

        componentMap.get(componentKey)!.stories.push(story);
      }
    }

    // If includeExamples is true, fetch HTML for the primary story of each component
    if (includeExamples) {
      for (const component of layoutComponents) {
        if (component.stories.length > 0) {
          try {
            // Try to find a "default" or "basic" story, otherwise use the first one
            const defaultStory =
              component.stories.find(s => /default|basic|simple/i.test(s.name || s.story || '')) ||
              component.stories[0];

            const html = await client.fetchComponentHTML(defaultStory!.id);

            // Add example to the component info
            (component as any).example = {
              storyId: defaultStory!.id,
              storyName: defaultStory!.name || defaultStory!.story,
              html: html.html,
              classes: html.classes,
            };
          } catch (error) {
            // Skip error to avoid interfering with JSON-RPC
            (component as any).example = {
              error: 'Failed to fetch example',
            };
          }
        }
      }
    }

    // Sort components by name
    layoutComponents.sort((a, b) => a.name.localeCompare(b.name));

    const response = {
      layoutComponents,
      totalCount: layoutComponents.length,
      includesExamples: includeExamples,
    };

    return formatSuccessResponse(response, `Found ${layoutComponents.length} layout components`);
  } catch (error) {
    return handleError(error);
  }
}
