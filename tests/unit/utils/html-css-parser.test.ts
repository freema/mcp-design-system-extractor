import { describe, it, expect } from 'vitest';
import { parse } from 'node-html-parser';

import {
  filterStorybookCSS,
  filterStorybookStyles,
  extractClasses,
  extractStyles,
  extractCustomProperties,
  parseCSSRules,
  parseHTMLBasic,
  parseHTMLDetailed,
  extractDesignTokens,
} from '../../../src/utils/html-css-parser.js';

describe('filterStorybookCSS', () => {
  it('drops Storybook chrome and keeps design-system rules', () => {
    const css = `
      .sb-show-main { padding: 0; }
      .btn { color: red; }
      #storybook-root { height: 100%; }
      .card { border: 1px solid #ccc; }
    `;

    const filtered = filterStorybookCSS(css);

    expect(filtered).toContain('.btn');
    expect(filtered).toContain('.card');
    expect(filtered).not.toContain('sb-show-main');
    expect(filtered).not.toContain('storybook-root');
  });

  it('drops emotion hash classes and docs wrappers', () => {
    const filtered = filterStorybookCSS(
      '.css-1x2y3z { color: blue; } .sbdocs-title { margin: 0; } .badge { color: green; }'
    );

    expect(filtered).toBe('.badge { color: green; }');
  });

  it('keeps a whole at-rule block together', () => {
    const filtered = filterStorybookCSS('@media (min-width: 40em) { .grid { display: grid; } }');

    expect(filtered).toBe('@media (min-width: 40em) { .grid { display: grid; } }');
  });

  it('returns an empty string for non-CSS input', () => {
    expect(filterStorybookCSS('')).toBe('');
    expect(filterStorybookCSS(null as any)).toBe('');
    expect(filterStorybookCSS(undefined as any)).toBe('');
    expect(filterStorybookCSS(42 as any)).toBe('');
  });

  it('ignores a rule that never closes', () => {
    expect(filterStorybookCSS('.btn { color: red;')).toBe('');
  });
});

describe('filterStorybookStyles', () => {
  it('filters each sheet and drops the ones left empty', () => {
    const result = filterStorybookStyles([
      '.sb-show-main { padding: 0; }',
      '.btn { color: red; }',
      '',
    ]);

    expect(result).toEqual(['.btn { color: red; }']);
  });
});

describe('extractClasses', () => {
  it('collects unique classes across quote styles', () => {
    const classes = extractClasses(
      `<div class="card card--large"><span class='badge'>1</span><b class="card">x</b></div>`
    );

    expect(classes.sort()).toEqual(['badge', 'card', 'card--large']);
  });

  it('tolerates extra whitespace in the attribute', () => {
    expect(extractClasses('<div class="  a   b  ">x</div>').sort()).toEqual(['a', 'b']);
  });

  it('returns an empty list when there are no classes', () => {
    expect(extractClasses('<div>plain</div>')).toEqual([]);
  });
});

describe('extractStyles', () => {
  it('picks up inline style tags and notes external stylesheets', () => {
    const root = parse(
      `<html><head>
         <style>.btn { color: red; }</style>
         <link rel="stylesheet" href="/main.css">
         <link rel="icon" href="/favicon.ico">
       </head><body></body></html>`
    );

    expect(extractStyles(root)).toEqual([
      '.btn { color: red; }',
      '/* External stylesheet: /main.css */',
    ]);
  });
});

describe('extractCustomProperties', () => {
  it('collects custom properties into the target object', () => {
    expect(extractCustomProperties(':root { --brand: #ff0000; --gap: 8px; }')).toEqual({
      '--brand': '#ff0000',
      '--gap': '8px',
    });
  });

  it('merges into a caller-supplied accumulator, last write winning', () => {
    const target = { '--brand': '#000000' };
    extractCustomProperties('--brand: #ffffff; --radius: 4px', target);

    expect(target).toEqual({ '--brand': '#ffffff', '--radius': '4px' });
  });

  it('ignores regular declarations', () => {
    expect(extractCustomProperties('color: red; padding: 4px')).toEqual({});
  });
});

describe('parseCSSRules', () => {
  it('reads every declaration in a rule, not just the first', () => {
    // Regression: the old single-regex scan folded the `;` separator into the
    // next property name, so this rule came back as
    // { color: 'red', '; padding': '4px' }.
    const rules = parseCSSRules('.btn { color: red; padding: 4px 8px; border: none; }');

    expect(rules).toEqual([
      {
        selector: '.btn',
        styles: { color: 'red', padding: '4px 8px', border: 'none' },
      },
    ]);
  });

  it('handles a value containing a colon', () => {
    const rules = parseCSSRules('.hero { background: url(http://example.com/a.png); }');

    expect(rules[0]!.styles['background']).toBe('url(http://example.com/a.png)');
  });

  it('parses multiple rules and skips empty ones', () => {
    const rules = parseCSSRules('.a { color: red } .empty { } .b { color: blue }');

    expect(rules.map(r => r.selector)).toEqual(['.a', '.b']);
  });

  it('returns nothing for input with no rules', () => {
    expect(parseCSSRules('')).toEqual([]);
  });
});

describe('parseHTMLBasic', () => {
  it('returns styles, classes and custom properties together', () => {
    const result = parseHTMLBasic(
      `<html><head><style>:root { --brand: #f00; }</style></head>
       <body><div class="card">hi</div></body></html>`
    );

    expect(result.styles).toEqual([':root { --brand: #f00; }']);
    expect(result.classes).toEqual(['card']);
    expect(result.customProperties).toEqual({ '--brand': '#f00' });
  });
});

describe('parseHTMLDetailed', () => {
  it('collects inline styles keyed by id, falling back to the tag name', () => {
    const result = parseHTMLDetailed(
      `<div id="hero" style="--pad: 2px; color: red"><span style="margin: 0">x</span></div>`
    );

    expect(result.inlineStyles).toEqual({
      hero: '--pad: 2px; color: red',
      span: 'margin: 0',
    });
    expect(result.customProperties).toEqual({ '--pad': '2px' });
  });

  it('returns sorted, de-duplicated class names', () => {
    const result = parseHTMLDetailed('<div class="z a"><span class="a m">x</span></div>');

    expect(result.classNames).toEqual(['a', 'm', 'z']);
  });

  it('parses the supplied stylesheets into rules', () => {
    const result = parseHTMLDetailed('<div class="btn">x</div>', [
      '.btn { color: red; } :root { --brand: #00f; }',
    ]);

    expect(result.cssRules.map(r => r.selector)).toEqual(['.btn', ':root']);
    expect(result.customProperties).toEqual({ '--brand': '#00f' });
  });
});

describe('extractDesignTokens', () => {
  it('categorises tokens by name and value', () => {
    const tokens = extractDesignTokens(`:root {
      --color-primary: #0055ff;
      --spacing-md: 16px;
      --font-family-base: Inter, sans-serif;
      --shadow-lg: 0 4px 8px rgba(0,0,0,.2);
      --border-style: solid;
      --transition-speed: ease-in-out;
    }`);

    const byName = Object.fromEntries(tokens.map(t => [t.name, t.type]));

    expect(byName['--color-primary']).toBe('color');
    expect(byName['--spacing-md']).toBe('spacing');
    expect(byName['--font-family-base']).toBe('typography');
    expect(byName['--shadow-lg']).toBe('shadow');
    expect(byName['--border-style']).toBe('border');
    expect(byName['--transition-speed']).toBe('other');
  });

  it('lets a bare unit value win over the border name', () => {
    // Documented quirk, not an accident of this test: spacing is checked
    // before border, and `4px` matches the spacing value pattern, so
    // `--border-radius: 4px` is typed as spacing while `--border-radius: 50%`
    // — same token, different unit — is too. Only non-unit values reach the
    // border branch.
    expect(extractDesignTokens('--border-radius: 4px;')[0]!.type).toBe('spacing');
    expect(extractDesignTokens('--border-radius: 0.25em 0;')[0]!.type).toBe('border');
  });

  it('detects a colour from the value when the name gives nothing away', () => {
    const tokens = extractDesignTokens('--brand: #fff; --accent: rgb(0, 0, 0);');

    expect(tokens.map(t => t.type)).toEqual(['color', 'color']);
  });

  it('keeps the raw value', () => {
    const [token] = extractDesignTokens('--gap: 1.5rem;');

    expect(token).toEqual({ name: '--gap', value: '1.5rem', type: 'spacing' });
  });

  it('returns nothing when there are no custom properties', () => {
    expect(extractDesignTokens('.btn { color: red; }')).toEqual([]);
  });
});
