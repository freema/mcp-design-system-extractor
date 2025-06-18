import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { StorybookClient } from '../utils/storybook-client.js';
import { handleError, formatSuccessResponse } from '../utils/error-handler.js';
import { validateGetComponentCompositionExamplesInput } from '../utils/validators.js';
import { ComponentComposition, CompositionExample } from '../types/storybook.js';

export const getComponentCompositionExamplesTool: Tool = {
  name: 'get_component_composition_examples',
  description:
    'Get examples of how components are combined together in real-world patterns and layouts. Returns HTML examples showing the component used with other components in forms, cards, layouts, or complex UI patterns from the Storybook stories',
  inputSchema: {
    type: 'object',
    properties: {
      componentId: {
        type: 'string',
        description: 'The story ID of the component (e.g., "example-button--primary")',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of examples to return (default: 5)',
      },
    },
    required: ['componentId'],
  },
};

export async function handleGetComponentCompositionExamples(input: any) {
  try {
    const validatedInput = validateGetComponentCompositionExamplesInput(input);
    const limit = validatedInput.limit || 5;
    const client = new StorybookClient();

    // Get the story index
    const index = await client.fetchStoriesIndex();
    const stories = index.stories || index.entries;

    if (!stories?.[validatedInput.componentId]) {
      throw new Error(`Component with ID "${validatedInput.componentId}" not found`);
    }

    const targetStory = stories[validatedInput.componentId]!;
    const componentName = targetStory.title?.split('/').pop() || targetStory.title || '';

    // Find stories that might contain compositions or complex examples
    const compositionPatterns = [
      /compos/i,
      /combin/i,
      /complex/i,
      /example/i,
      /demo/i,
      /usage/i,
      /pattern/i,
      /template/i,
      /layout/i,
      /page/i,
      /form/i,
      /card/i,
    ];

    const examples: CompositionExample[] = [];

    // Look for stories in the same component group first
    const componentPrefix = validatedInput.componentId.split('--')[0];
    const relatedStories = Object.entries(stories).filter(
      ([id]) => id.startsWith(componentPrefix || '') && id !== validatedInput.componentId
    );

    // Then look for stories that might use this component
    const allStories = Object.entries(stories);

    for (const [storyId, story] of [...relatedStories, ...allStories]) {
      if (examples.length >= limit) {
        break;
      }

      const storyName = story.name || story.story || '';
      const storyTitle = story.title || '';

      // Check if this story might contain composition examples
      const isComposition = compositionPatterns.some(
        pattern => pattern.test(storyName) || pattern.test(storyTitle)
      );

      if (isComposition || storyTitle.toLowerCase().includes(componentName.toLowerCase())) {
        try {
          const html = await client.fetchComponentHTML(storyId);

          // Analyze the HTML to extract component usage
          const usedComponents = extractComponentNames(html.html);

          // Only include if it uses multiple components or has complex structure
          if (usedComponents.length > 1 || html.html.length > 500) {
            const example: CompositionExample = {
              name: storyName || storyTitle,
              description: `Example showing ${componentName} used with ${usedComponents.slice(0, 3).join(', ')}${usedComponents.length > 3 ? ' and more' : ''}`,
              html: html.html,
              components: usedComponents,
              props: story.args || {},
            };

            examples.push(example);
          }
        } catch (error) {
          // Skip error to avoid interfering with JSON-RPC
        }
      }
    }

    // If we didn't find enough examples, create some generic patterns
    if (examples.length === 0) {
      examples.push({
        name: 'Basic Form Pattern',
        description: `Example of ${componentName} in a form context`,
        html: generateFormExample(componentName),
        components: [componentName, 'Form', 'FormGroup'],
        props: {},
      });

      examples.push({
        name: 'Card Layout Pattern',
        description: `Example of ${componentName} in a card layout`,
        html: generateCardExample(componentName),
        components: [componentName, 'Card', 'CardContent'],
        props: {},
      });
    }

    const composition: ComponentComposition = {
      storyId: validatedInput.componentId,
      examples: examples.slice(0, limit),
    };

    return formatSuccessResponse(
      composition,
      `Retrieved ${composition.examples.length} composition examples`
    );
  } catch (error) {
    return handleError(error);
  }
}

function extractComponentNames(html: string): string[] {
  const components = new Set<string>();

  // Extract React-style components
  const reactPattern = /<([A-Z][a-zA-Z0-9]*)\s*[^>]*>/g;
  let match;
  while ((match = reactPattern.exec(html)) !== null) {
    if (match[1]) {
      components.add(match[1]);
    }
  }

  // Extract web components
  const webComponentPattern = /<([a-z]+-[a-z-]+)\s*[^>]*>/g;
  while ((match = webComponentPattern.exec(html)) !== null) {
    if (match[1]) {
      components.add(match[1]);
    }
  }

  // Extract from CSS classes
  const classPattern = /class="([^"]*)"/g;
  while ((match = classPattern.exec(html)) !== null) {
    if (match[1]) {
      const classes = match[1].split(/\s+/);
      for (const cls of classes) {
        if (/^[A-Z]/.test(cls)) {
          const componentName = cls.split('-')[0];
          if (componentName) {
            components.add(componentName);
          }
        }
      }
    }
  }

  return Array.from(components).filter(c => !isHTMLElement(c));
}

function isHTMLElement(tagName: string): boolean {
  const htmlElements = ['div', 'span', 'p', 'a', 'button', 'input', 'form'];
  return htmlElements.includes(tagName.toLowerCase());
}

function generateFormExample(componentName: string): string {
  const name = componentName || 'Component';
  return `
<form class="form-example">
  <div class="form-group">
    <label for="example">Example Label</label>
    <${name} id="example" placeholder="Enter value" />
  </div>
  <div class="form-actions">
    <button type="submit">Submit</button>
    <button type="button">Cancel</button>
  </div>
</form>`;
}

function generateCardExample(componentName: string): string {
  const name = componentName || 'Component';
  return `
<div class="card">
  <div class="card-header">
    <h3>Card Title</h3>
  </div>
  <div class="card-content">
    <p>This is an example of ${name} used within a card layout.</p>
    <${name} />
  </div>
  <div class="card-footer">
    <button>Action</button>
  </div>
</div>`;
}
