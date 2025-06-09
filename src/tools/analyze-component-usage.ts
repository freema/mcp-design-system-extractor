import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { StorybookClient } from '../utils/storybook-client.js';
import { handleError, formatSuccessResponse } from '../utils/error-handler.js';
import { validateAnalyzeComponentUsageInput } from '../utils/validators.js';
import { ComponentUsageAnalysis } from '../types/storybook.js';

export const analyzeComponentUsageTool: Tool = {
  name: 'analyze_component_usage',
  description: 'Analyze how a component is used across different stories and variants',
  inputSchema: {
    type: 'object',
    properties: {
      componentName: {
        type: 'string',
        description: 'The name of the component to analyze'
      },
      includeProps: {
        type: 'boolean',
        description: 'Whether to include detailed props analysis (default: true)'
      }
    },
    required: ['componentName']
  }
};

export async function handleAnalyzeComponentUsage(input: any) {
  try {
    const validatedInput = validateAnalyzeComponentUsageInput(input);
    const client = new StorybookClient();
    
    const storiesIndex = await client.fetchStoriesIndex();
    const stories = storiesIndex.stories || storiesIndex.entries || {};
    const componentStories = Object.values(stories).filter(story => {
      const componentName = story.title.split('/').pop() || story.title;
      return componentName.toLowerCase() === validatedInput.componentName.toLowerCase();
    });
    
    if (componentStories.length === 0) {
      return handleError(`No stories found for component: ${validatedInput.componentName}`);
    }
    
    const analysis: ComponentUsageAnalysis = {
      componentName: validatedInput.componentName,
      totalVariants: componentStories.length,
      commonProps: {},
      propsUsage: {},
      categories: []
    };
    
    const categories = new Set<string>();
    const allProps = new Map<string, { frequency: number; values: Set<string> }>();
    
    componentStories.forEach(story => {
      const category = story.title.split('/').slice(0, -1).join('/');
      if (category) {
        categories.add(category);
      }
      
      if (validatedInput.includeProps !== false && story.args) {
        Object.entries(story.args).forEach(([prop, value]) => {
          if (!allProps.has(prop)) {
            allProps.set(prop, { frequency: 0, values: new Set() });
          }
          
          const propData = allProps.get(prop)!;
          propData.frequency++;
          propData.values.add(String(value));
        });
      }
    });
    
    analysis.categories = Array.from(categories);
    
    if (validatedInput.includeProps !== false) {
      allProps.forEach((data, prop) => {
        analysis.commonProps[prop] = {
          frequency: data.frequency,
          values: Array.from(data.values)
        };
        analysis.propsUsage[prop] = data.frequency;
      });
    }
    
    return formatSuccessResponse(analysis, `Usage analysis for component: ${validatedInput.componentName}`);
  } catch (error) {
    return handleError(error);
  }
}