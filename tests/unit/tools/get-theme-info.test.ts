import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  createStorybookClientStub,
  delegatingClient,
  parseToolResponse,
  responseText,
  type StorybookClientStub,
} from '../../helpers/storybook-fixture.js';

let stub: StorybookClientStub;

vi.mock('../../../src/utils/storybook-client.js', () => ({
  StorybookClient: vi.fn(function () {
    return delegatingClient(() => stub);
  }),
}));

const { handleGetThemeInfo } = await import('../../../src/tools/get-theme-info.js');

const indexWith = (entries: Record<string, { title: string; name: string }>) => {
  stub.fetchStoriesIndex.mockResolvedValue({
    v: 5,
    entries: Object.fromEntries(
      Object.entries(entries).map(([id, story]) => [id, { id, ...story }])
    ),
  });
};

const htmlWith = (styles: string[], html = '<div></div>') => {
  stub.fetchComponentHTML.mockResolvedValue({ storyId: 'x', html, styles, classes: [] });
};

beforeEach(() => {
  stub = createStorybookClientStub();
});

describe('handleGetThemeInfo', () => {
  it('prefers a theme-ish story over the first one in the index', async () => {
    indexWith({
      'components-button--primary': { title: 'Components/Button', name: 'Primary' },
      'foundation-colors--all': { title: 'Foundation/Colors', name: 'All' },
    });
    htmlWith([':root { --color-primary: #0055ff; }']);

    const data = parseToolResponse(await handleGetThemeInfo({}));

    expect(data.sourceStoryId).toBe('foundation-colors--all');
    expect(stub.fetchComponentHTML).toHaveBeenCalledWith('foundation-colors--all');
  });

  it('falls back to the first story when nothing looks like a theme', async () => {
    indexWith({
      'components-button--primary': { title: 'Components/Button', name: 'Primary' },
      'components-card--default': { title: 'Components/Card', name: 'Default' },
    });
    htmlWith([]);

    expect(parseToolResponse(await handleGetThemeInfo({})).sourceStoryId).toBe(
      'components-button--primary'
    );
  });

  it('sorts tokens into theme buckets', async () => {
    indexWith({ 'theme--tokens': { title: 'Theme', name: 'Tokens' } });
    htmlWith([
      `:root {
        --color-primary: #0055ff;
        --spacing-md: 16px;
        --font-size-body: 14px;
        --breakpoint-md: 960px;
        --shadow-card: 0 1px 2px rgba(0,0,0,.1);
        --radius-sm: 2px;
      }`,
    ]);

    const { theme, totalTokens } = parseToolResponse(await handleGetThemeInfo({}));

    expect(totalTokens).toBe(6);
    expect(theme.colors).toEqual({ '--color-primary': '#0055ff' });
    expect(theme.spacing).toEqual({ '--spacing-md': '16px' });
    expect(theme.typography).toEqual({ '--font-size-body': '14px' });
    expect(theme.breakpoints).toEqual({ '--breakpoint-md': '960px' });
    expect(theme.shadows).toEqual({ '--shadow-card': '0 1px 2px rgba(0,0,0,.1)' });
    expect(theme.radii).toEqual({ '--radius-sm': '2px' });
  });

  it('files a token by its name even when the value looks like spacing', async () => {
    // Regression: `isSpacingValue` was evaluated inside the spacing branch,
    // ahead of the breakpoint and radius checks, so any token whose value was
    // a bare unit ended up as spacing regardless of its name.
    indexWith({ 'theme--tokens': { title: 'Theme', name: 'Tokens' } });
    htmlWith([':root { --breakpoint-lg: 1280px; --radius-pill: 999px; }']);

    const { theme } = parseToolResponse(await handleGetThemeInfo({}));

    expect(theme.breakpoints).toEqual({ '--breakpoint-lg': '1280px' });
    expect(theme.radii).toEqual({ '--radius-pill': '999px' });
    expect(theme.spacing).toEqual({});
  });

  it('falls back to the value when the name says nothing', async () => {
    indexWith({ 'theme--tokens': { title: 'Theme', name: 'Tokens' } });
    htmlWith([':root { --brand: #0055ff; --gutter: 24px; }']);

    const { theme } = parseToolResponse(await handleGetThemeInfo({}));

    expect(theme.colors).toEqual({ '--brand': '#0055ff' });
    expect(theme.spacing).toEqual({ '--gutter': '24px' });
  });

  it('also reads tokens off inline style attributes', async () => {
    indexWith({ 'theme--tokens': { title: 'Theme', name: 'Tokens' } });
    htmlWith([], '<div style="--color-accent: #ff0000">x</div>');

    const { theme } = parseToolResponse(await handleGetThemeInfo({}));

    expect(theme.colors).toEqual({ '--color-accent': '#ff0000' });
  });

  it('substitutes default breakpoints when the design system defines none', async () => {
    indexWith({ 'theme--tokens': { title: 'Theme', name: 'Tokens' } });
    htmlWith([':root { --color-primary: #000; }']);

    const { theme } = parseToolResponse(await handleGetThemeInfo({}));

    expect(Object.keys(theme.breakpoints)).toEqual([
      '--breakpoint-xs',
      '--breakpoint-sm',
      '--breakpoint-md',
      '--breakpoint-lg',
      '--breakpoint-xl',
    ]);
  });

  it('drops uncategorised tokens unless includeAll is set', async () => {
    indexWith({ 'theme--tokens': { title: 'Theme', name: 'Tokens' } });
    htmlWith([':root { --transition-fast: 150ms ease; }']);

    expect(parseToolResponse(await handleGetThemeInfo({})).theme.other).toBeUndefined();

    const withAll = parseToolResponse(await handleGetThemeInfo({ includeAll: true }));
    expect(withAll.theme.other).toEqual({ '--transition-fast': '150ms ease' });
    // Either way the count reflects everything that was found.
    expect(withAll.totalTokens).toBe(1);
  });

  it('reports an index with no stories', async () => {
    stub.fetchStoriesIndex.mockResolvedValue({ v: 5 } as any);

    expect(responseText(await handleGetThemeInfo({}))).toBe(
      'Error: No stories found in Storybook index'
    );
  });

  it('reports an empty index', async () => {
    indexWith({});

    expect(responseText(await handleGetThemeInfo({}))).toBe(
      'Error: No stories available to extract theme information'
    );
  });

  it('rejects a non-boolean includeAll', async () => {
    expect(responseText(await handleGetThemeInfo({ includeAll: 'yes' }))).toMatch(/^Error:/);
  });
});
