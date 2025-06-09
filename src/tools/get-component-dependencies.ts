import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { StorybookClient } from '../utils/storybook-client.js';
import { handleError, formatSuccessResponse } from '../utils/error-handler.js';
import { validateGetComponentDependenciesInput } from '../utils/validators.js';
import { ComponentDependencies } from '../types/storybook.js';

export const getComponentDependenciesTool: Tool = {
  name: 'get_component_dependencies',
  description: 'Analyze rendered HTML to find which other components a given component internally uses by detecting React components, web components, and CSS class patterns',
  inputSchema: {
    type: 'object',
    properties: {
      componentId: {
        type: 'string',
        description: 'The story ID of the component (e.g., "example-button--primary")',
      },
    },
    required: ['componentId'],
  },
};

export async function handleGetComponentDependencies(input: any) {
  try {
    const validatedInput = validateGetComponentDependenciesInput(input);
    const client = new StorybookClient();

    // Fetch the component HTML
    const componentHTML = await client.fetchComponentHTML(validatedInput.componentId);

    // Analyze the HTML to find other components
    const dependencies = new Set<string>();
    const internalComponents = new Set<string>();
    const externalComponents = new Set<string>();

    // Common patterns for component detection
    const componentPatterns = [
      // React-style components: <Button>, <MuiButton>
      /<([A-Z][a-zA-Z0-9]*)\s*[^>]*>/g,
      // Web components: <my-button>, <app-header>
      /<([a-z]+-[a-z-]+)\s*[^>]*>/g,
      // Angular/Vue style: <app-button>, <v-btn>
      /<(app-[a-z-]+|v-[a-z-]+)\s*[^>]*>/g,
    ];

    // Extract component names from HTML
    for (const pattern of componentPatterns) {
      let match;
      while ((match = pattern.exec(componentHTML.html)) !== null) {
        const componentName = match[1];
        if (componentName && !isHTMLElement(componentName)) {
          dependencies.add(componentName);
        }
      }
    }

    // Also check for CSS classes that might indicate component usage
    const classPatterns = [
      /\b([A-Z][a-zA-Z0-9]+)-root\b/g,
      /\bMui([A-Z][a-zA-Z0-9]+)\b/g,
      /\bcomponent-([a-z-]+)\b/g,
    ];

    for (const pattern of classPatterns) {
      let match;
      while ((match = pattern.exec(componentHTML.html)) !== null) {
        const componentName = match[1];
        if (componentName) {
          dependencies.add(componentName);
        }
      }
    }

    // Try to categorize dependencies
    const allDependencies = Array.from(dependencies);
    for (const dep of allDependencies) {
      // Heuristic: if it starts with Mui, Material, Ant, etc., it's external
      if (/^(Mui|Material|Ant|Bootstrap|Semantic)/i.test(dep)) {
        externalComponents.add(dep);
      } else {
        internalComponents.add(dep);
      }
    }

    const componentDependencies: ComponentDependencies = {
      storyId: validatedInput.componentId,
      dependencies: allDependencies.sort(),
      internalComponents: Array.from(internalComponents).sort(),
      externalComponents: Array.from(externalComponents).sort(),
    };

    return formatSuccessResponse(
      componentDependencies,
      `Retrieved dependencies for component: ${validatedInput.componentId}`
    );
  } catch (error) {
    return handleError(error);
  }
}

function isHTMLElement(tagName: string): boolean {
  const htmlElements = [
    'div',
    'span',
    'p',
    'a',
    'button',
    'input',
    'form',
    'label',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'ul',
    'ol',
    'li',
    'table',
    'tr',
    'td',
    'th',
    'thead',
    'tbody',
    'tfoot',
    'img',
    'video',
    'audio',
    'canvas',
    'svg',
    'path',
    'g',
    'header',
    'footer',
    'nav',
    'main',
    'section',
    'article',
    'aside',
    'details',
    'summary',
    'figure',
    'figcaption',
  ];

  return htmlElements.includes(tagName.toLowerCase());
}
