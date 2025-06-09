import { parse } from 'node-html-parser';
import { CSSRule, DesignToken } from '../types/storybook.js';

export function extractComponentStyles(html: string, styleSheets: string[] = []) {
  const root = parse(html);

  const cssRules: CSSRule[] = [];
  const inlineStyles: Record<string, string> = {};
  const classNames = new Set<string>();
  const customProperties: Record<string, string> = {};

  root.querySelectorAll('*').forEach(element => {
    const style = element.getAttribute('style');
    if (style) {
      const elementId = element.getAttribute('id') || element.tagName.toLowerCase();
      inlineStyles[elementId] = style;

      extractCustomPropertiesFromStyle(style, customProperties);
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

  styleSheets.forEach(stylesheet => {
    const rules = parseCSSRules(stylesheet);
    cssRules.push(...rules);

    extractCustomPropertiesFromCSS(stylesheet, customProperties);
  });

  return {
    storyId: '',
    cssRules,
    inlineStyles,
    classNames: Array.from(classNames).sort(),
    customProperties,
  };
}

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
    const propertyRegex = /([^:]+):\s*([^;]+)/g;
    let propMatch;

    while ((propMatch = propertyRegex.exec(styleBlock)) !== null) {
      if (!propMatch[1] || !propMatch[2]) {
        continue;
      }

      const property = propMatch[1].trim();
      const value = propMatch[2].trim();
      styles[property] = value;
    }

    if (Object.keys(styles).length > 0) {
      rules.push({ selector, styles });
    }
  }

  return rules;
}

export function extractDesignTokens(cssContent: string): DesignToken[] {
  const tokens: DesignToken[] = [];

  const customPropertyRegex = /--([\w-]+):\s*([^;]+)/g;
  let match;

  while ((match = customPropertyRegex.exec(cssContent)) !== null) {
    if (!match[1] || !match[2]) {
      continue;
    }

    const name = match[1];
    const value = match[2].trim();

    const token: DesignToken = {
      name: `--${name}`,
      value,
      type: categorizeToken(name, value),
    };

    tokens.push(token);
  }

  return tokens;
}

function extractCustomPropertiesFromStyle(
  style: string,
  customProperties: Record<string, string>
): void {
  const propertyRegex = /--([\w-]+):\s*([^;]+)/g;
  let match;

  while ((match = propertyRegex.exec(style)) !== null) {
    if (!match[1] || !match[2]) {
      continue;
    }

    const name = `--${match[1]}`;
    const value = match[2].trim();
    customProperties[name] = value;
  }
}

function extractCustomPropertiesFromCSS(
  css: string,
  customProperties: Record<string, string>
): void {
  const propertyRegex = /--([\w-]+):\s*([^;]+)/g;
  let match;

  while ((match = propertyRegex.exec(css)) !== null) {
    if (!match[1] || !match[2]) {
      continue;
    }

    const name = `--${match[1]}`;
    const value = match[2].trim();
    customProperties[name] = value;
  }
}

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
