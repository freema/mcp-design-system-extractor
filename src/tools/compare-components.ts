import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { StorybookClient } from '../utils/storybook-client.js';
import { extractComponentStyles } from '../utils/html-parser.js';
import { handleError, formatSuccessResponse } from '../utils/error-handler.js';
import { validateCompareComponentsInput } from '../utils/validators.js';
import { ComponentComparison } from '../types/storybook.js';

export const compareComponentsTool: Tool = {
  name: 'compare_components',
  description: 'Compare HTML and styles between two component variants',
  inputSchema: {
    type: 'object',
    properties: {
      componentId1: {
        type: 'string',
        description: 'The story ID of the first component'
      },
      componentId2: {
        type: 'string',
        description: 'The story ID of the second component'
      },
      compareStyles: {
        type: 'boolean',
        description: 'Whether to include style comparison (default: true)'
      }
    },
    required: ['componentId1', 'componentId2']
  }
};

export async function handleCompareComponents(input: any) {
  try {
    const validatedInput = validateCompareComponentsInput(input);
    const client = new StorybookClient();
    
    const [component1, component2] = await Promise.all([
      client.fetchComponentHTML(validatedInput.componentId1),
      client.fetchComponentHTML(validatedInput.componentId2)
    ]);
    
    const htmlDiff = compareHTML(component1.html, component2.html);
    const classesDiff = compareClasses(component1.classes || [], component2.classes || []);
    
    let stylesDiff: string[] = [];
    if (validatedInput.compareStyles !== false) {
      const styles1 = extractComponentStyles(component1.html, component1.styles);
      const styles2 = extractComponentStyles(component2.html, component2.styles);
      stylesDiff = compareStyles(styles1.cssRules, styles2.cssRules);
    }
    
    const comparison: ComponentComparison = {
      component1,
      component2,
      differences: {
        htmlDiff,
        stylesDiff,
        classesDiff
      }
    };
    
    return formatSuccessResponse(comparison, `Comparison between ${validatedInput.componentId1} and ${validatedInput.componentId2}`);
  } catch (error) {
    return handleError(error);
  }
}

function compareHTML(html1: string, html2: string): string[] {
  const differences: string[] = [];
  
  if (html1.trim() === html2.trim()) {
    differences.push('HTML content is identical');
  } else {
    differences.push('HTML content differs');
    
    const tags1 = extractTags(html1);
    const tags2 = extractTags(html2);
    
    const uniqueToFirst = tags1.filter(tag => !tags2.includes(tag));
    const uniqueToSecond = tags2.filter(tag => !tags1.includes(tag));
    
    if (uniqueToFirst.length > 0) {
      differences.push(`Tags only in first component: ${uniqueToFirst.join(', ')}`);
    }
    
    if (uniqueToSecond.length > 0) {
      differences.push(`Tags only in second component: ${uniqueToSecond.join(', ')}`);
    }
  }
  
  return differences;
}

function compareClasses(classes1: string[], classes2: string[]): { added: string[]; removed: string[] } {
  const set1 = new Set(classes1);
  const set2 = new Set(classes2);
  
  const added = classes2.filter(cls => !set1.has(cls));
  const removed = classes1.filter(cls => !set2.has(cls));
  
  return { added, removed };
}

function compareStyles(rules1: any[], rules2: any[]): string[] {
  const differences: string[] = [];
  
  const selectors1 = new Set(rules1.map(rule => rule.selector));
  const selectors2 = new Set(rules2.map(rule => rule.selector));
  
  const uniqueToFirst = [...selectors1].filter(sel => !selectors2.has(sel));
  const uniqueToSecond = [...selectors2].filter(sel => !selectors1.has(sel));
  
  if (uniqueToFirst.length > 0) {
    differences.push(`Selectors only in first component: ${uniqueToFirst.join(', ')}`);
  }
  
  if (uniqueToSecond.length > 0) {
    differences.push(`Selectors only in second component: ${uniqueToSecond.join(', ')}`);
  }
  
  return differences;
}

function extractTags(html: string): string[] {
  const tagRegex = /<(\w+)(?:\s[^>]*)?>/g;
  const tags = new Set<string>();
  
  let match;
  while ((match = tagRegex.exec(html)) !== null) {
    tags.add(match[1].toLowerCase());
  }
  
  return Array.from(tags).sort();
}