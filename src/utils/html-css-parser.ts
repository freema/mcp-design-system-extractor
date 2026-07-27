import { parse, HTMLElement } from 'node-html-parser';
import { CSSRule, DesignToken } from '../types/storybook.js';

/**
 * Patterns to identify Storybook boilerplate CSS that should be filtered out
 */
const STORYBOOK_CSS_PATTERNS = [
  /\.sb-[a-zA-Z0-9_-]+/,
  /#storybook-[a-zA-Z0-9_-]+/,
  /\.docs-story[a-zA-Z0-9_-]*/,
  /@keyframes sb-[a-zA-Z0-9_-]+/,
  /\.innerZoomElementWrapper/,
  /\.css-[a-z0-9]+/,
  /\[data-storyloaded\]/,
  /\.sb-show-main/,
  /\.sb-main-padded/,
  /#root\[hidden\]/,
  /body\.sb-/,
  /\.sbdocs[a-zA-Z0-9_-]*/,
];

/**
 * Check if a CSS selector matches Storybook boilerplate patterns
 */
function isStorybookSelector(selector: string): boolean {
  return STORYBOOK_CSS_PATTERNS.some(pattern => pattern.test(selector));
}

/**
 * Filter out Storybook boilerplate CSS from a stylesheet string
 * Removes entire CSS rules that match Storybook-specific patterns
 */
export function filterStorybookCSS(css: string): string {
  if (!css || typeof css !== 'string') {
    return '';
  }

  const lines: string[] = [];
  let currentRule = '';
  let braceCount = 0;
  let shouldSkip = false;

  for (const char of css) {
    currentRule += char;

    if (char === '{') {
      braceCount++;
      if (braceCount === 1) {
        const selector = currentRule.slice(0, -1).trim();
        shouldSkip = isStorybookSelector(selector);
      }
    } else if (char === '}') {
      braceCount--;
      if (braceCount === 0) {
        if (!shouldSkip && currentRule.trim()) {
          lines.push(currentRule.trim());
        }
        currentRule = '';
        shouldSkip = false;
      }
    }
  }

  return lines.join('\n\n');
}

/**
 * Filter styles array to remove Storybook boilerplate
 */
export function filterStorybookStyles(styles: string[]): string[] {
  return styles.map(style => filterStorybookCSS(style)).filter(style => style.trim().length > 0);
}

export interface ParsedHTML {
  styles: string[];
  classes: string[];
  customProperties: Record<string, string>;
}

export interface DetailedStyles {
  cssRules: CSSRule[];
  inlineStyles: Record<string, string>;
  classNames: string[];
  customProperties: Record<string, string>;
}

/**
 * Extract CSS classes from HTML string using regex
 */
export function extractClasses(html: string): string[] {
  const classRegex = /class=["']([^"']+)["']/g;
  const classes = new Set<string>();
  let match;

  while ((match = classRegex.exec(html)) !== null) {
    if (match[1]) {
      const classList = match[1].split(/\s+/);
      classList.forEach(cls => {
        if (cls.trim()) {
          classes.add(cls.trim());
        }
      });
    }
  }

  return Array.from(classes);
}

/**
 * Extract styles from parsed HTML document
 */
export function extractStyles(root: HTMLElement): string[] {
  const styles: string[] = [];

  // Extract inline styles
  root.querySelectorAll('style').forEach((style: any) => {
    if (style.text) {
      styles.push(style.text);
    }
  });

  // Add external stylesheet references
  root.querySelectorAll('link[rel="stylesheet"]').forEach((link: any) => {
    const href = link.getAttribute('href');
    if (href) {
      styles.push(`/* External stylesheet: ${href} */`);
    }
  });

  return styles;
}

/**
 * Extract custom CSS properties from style string
 */
export function extractCustomProperties(
  styleContent: string,
  target: Record<string, string> = {}
): Record<string, string> {
  const propertyRegex = /--([\w-]+):\s*([^;]+)/g;
  let match;

  while ((match = propertyRegex.exec(styleContent)) !== null) {
    if (match[1] && match[2]) {
      const name = `--${match[1]}`;
      const value = match[2].trim();
      target[name] = value;
    }
  }

  return target;
}

/**
 * Parse CSS rules from CSS string
 */
export function parseCSSRules(css: string): CSSRule[] {
  const rules: CSSRule[] = [];
  const ruleRegex = /([^{]+)\s*\{([^}]+)\}/g;
  let match;

  while ((match = ruleRegex.exec(css)) !== null) {
    if (!match[1] || !match[2]) {
      continue;
    }

    const selector = match[1].trim();
    const styleBlock = match[2];

    const styles: Record<string, string> = {};

    // Split on the declaration separator first. Running a single
    // `([^:]+):\s*([^;]+)` regex across the whole block swallowed the
    // separator into the next property name, so `color: red; padding: 4px`
    // produced a key of `; padding` for everything after the first
    // declaration.
    for (const declaration of styleBlock.split(';')) {
      const separator = declaration.indexOf(':');
      if (separator === -1) {
        continue;
      }

      const property = declaration.slice(0, separator).trim();
      const value = declaration.slice(separator + 1).trim();
      if (property && value) {
        styles[property] = value;
      }
    }

    if (Object.keys(styles).length > 0) {
      rules.push({ selector, styles });
    }
  }

  return rules;
}

/**
 * Simple HTML parsing for basic information extraction
 */
export function parseHTMLBasic(html: string): ParsedHTML {
  const root = parse(html);
  const styles = extractStyles(root);
  const classes = extractClasses(html);
  const customProperties: Record<string, string> = {};

  // Extract custom properties from all styles
  styles.forEach(style => {
    extractCustomProperties(style, customProperties);
  });

  return {
    styles,
    classes,
    customProperties,
  };
}

/**
 * Detailed HTML parsing with comprehensive style analysis
 */
export function parseHTMLDetailed(html: string, styleSheets: string[] = []): DetailedStyles {
  const root = parse(html);
  const cssRules: CSSRule[] = [];
  const inlineStyles: Record<string, string> = {};
  const classNames = new Set<string>();
  const customProperties: Record<string, string> = {};

  // Process all elements
  root.querySelectorAll('*').forEach(element => {
    const style = element.getAttribute('style');
    if (style) {
      const elementId = element.getAttribute('id') || element.tagName.toLowerCase();
      inlineStyles[elementId] = style;
      extractCustomProperties(style, customProperties);
    }

    const classAttr = element.getAttribute('class');
    if (classAttr) {
      classAttr.split(/\s+/).forEach(cls => {
        if (cls.trim()) {
          classNames.add(cls.trim());
        }
      });
    }
  });

  // Process stylesheets
  styleSheets.forEach(stylesheet => {
    const rules = parseCSSRules(stylesheet);
    cssRules.push(...rules);
    extractCustomProperties(stylesheet, customProperties);
  });

  return {
    cssRules,
    inlineStyles,
    classNames: Array.from(classNames).sort(),
    customProperties,
  };
}

/**
 * Extract design tokens from CSS content
 */
export function extractDesignTokens(cssContent: string): DesignToken[] {
  const tokens: DesignToken[] = [];
  const customPropertyRegex = /--([\w-]+):\s*([^;]+)/g;
  let match;

  while ((match = customPropertyRegex.exec(cssContent)) !== null) {
    if (match[1] && match[2]) {
      const name = match[1];
      const value = match[2].trim();

      const token: DesignToken = {
        name: `--${name}`,
        value,
        type: categorizeToken(name, value),
      };

      tokens.push(token);
    }
  }

  return tokens;
}

/**
 * Categorize design token by name and value
 */
function categorizeToken(name: string, value: string): DesignToken['type'] {
  const lowerName = name.toLowerCase();
  const lowerValue = value.toLowerCase();

  if (
    lowerName.includes('color') ||
    lowerName.includes('bg') ||
    lowerName.includes('text') ||
    /^#[0-9a-f]{3,8}$/i.test(value) ||
    /^rgb\(/.test(lowerValue) ||
    /^rgba\(/.test(lowerValue) ||
    /^hsl\(/.test(lowerValue) ||
    /^hsla\(/.test(lowerValue)
  ) {
    return 'color';
  }

  if (
    lowerName.includes('space') ||
    lowerName.includes('margin') ||
    lowerName.includes('padding') ||
    lowerName.includes('gap') ||
    lowerName.includes('size') ||
    /^\d+(px|rem|em|%)$/.test(value)
  ) {
    return 'spacing';
  }

  if (
    lowerName.includes('font') ||
    lowerName.includes('text') ||
    lowerName.includes('weight') ||
    lowerName.includes('family')
  ) {
    return 'typography';
  }

  if (lowerName.includes('shadow') || lowerName.includes('elevation')) {
    return 'shadow';
  }

  if (lowerName.includes('border') || lowerName.includes('radius')) {
    return 'border';
  }

  return 'other';
}
