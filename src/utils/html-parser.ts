import { parseHTMLDetailed, extractDesignTokens, parseCSSRules } from './html-css-parser.js';

export function extractComponentStyles(html: string, styleSheets: string[] = []) {
  const result = parseHTMLDetailed(html, styleSheets);
  
  return {
    storyId: '',
    cssRules: result.cssRules,
    inlineStyles: result.inlineStyles,
    classNames: result.classNames,
    customProperties: result.customProperties,
  };
}

// Re-export from consolidated parser
export { parseCSSRules, extractDesignTokens } from './html-css-parser.js';

// All parsing functions are now available from the consolidated parser
// This file serves as a legacy interface