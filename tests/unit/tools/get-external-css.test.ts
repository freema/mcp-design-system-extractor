import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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

const { handleGetExternalCSS } = await import('../../../src/tools/get-external-css.js');

const CSS = `:root {
  --color-primary: #0055ff;
  --spacing-md: 16px;
  --font-family-base: Inter, sans-serif;
  --shadow-card: 0 1px 2px rgba(0,0,0,.1);
  --border-style: solid;
  --breakpoint-lg: xl;
  --transition-fast: ease-in;
}
.btn { color: var(--color-primary); padding: var(--spacing-md); }
@media (min-width: 40em) { .btn { display: block; } }`;

let fetchMock: ReturnType<typeof vi.fn>;

const cssResponse = (body: string) => ({
  ok: true,
  status: 200,
  statusText: 'OK',
  text: async () => body,
});

beforeEach(() => {
  stub = createStorybookClientStub();
  fetchMock = vi.fn().mockResolvedValue(cssResponse(CSS));
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('handleGetExternalCSS — URL handling', () => {
  it('resolves a relative path against the Storybook URL', async () => {
    const data = parseToolResponse(await handleGetExternalCSS({ cssUrl: '/assets/main.css' }));

    expect(fetchMock.mock.calls[0]![0]).toBe('http://localhost:6006/assets/main.css');
    expect(data.url).toBe('http://localhost:6006/assets/main.css');
    expect(data.originalUrl).toBe('/assets/main.css');
  });

  it('accepts an absolute URL on the Storybook host', async () => {
    await handleGetExternalCSS({ cssUrl: 'http://localhost:6006/main.css' });

    expect(fetchMock.mock.calls[0]![0]).toBe('http://localhost:6006/main.css');
  });

  it('accepts a subdomain of the Storybook host', async () => {
    stub.getStorybookUrl.mockReturnValue('https://example.com');

    const response = await handleGetExternalCSS({ cssUrl: 'https://cdn.example.com/main.css' });

    expect(responseText(response)).not.toMatch(/^Error:/);
  });

  it('refuses a third-party host', async () => {
    const text = responseText(await handleGetExternalCSS({ cssUrl: 'https://evil.test/main.css' }));

    expect(text).toMatch(/^Error:/);
    expect(text).toContain('[SECURITY_ERROR]');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuses a lookalike host that merely ends with the same string', async () => {
    stub.getStorybookUrl.mockReturnValue('https://example.com');

    const text = responseText(
      await handleGetExternalCSS({ cssUrl: 'https://notexample.com/main.css' })
    );

    expect(text).toContain('[SECURITY_ERROR]');
  });

  it('requires a cssUrl', async () => {
    expect(responseText(await handleGetExternalCSS({}))).toMatch(/^Error:/);
    expect(responseText(await handleGetExternalCSS({ cssUrl: '' }))).toMatch(/^Error:/);
    expect(responseText(await handleGetExternalCSS(null))).toMatch(/^Error:/);
  });
});

describe('handleGetExternalCSS — response shape', () => {
  it('returns tokens and statistics but no CSS by default', async () => {
    const response = await handleGetExternalCSS({ cssUrl: '/main.css' });
    const data = parseToolResponse(response);

    expect(data).not.toHaveProperty('content');
    expect(data.tokensExtracted).toBe(true);
    expect(data.tokenCount).toBe(7);
    expect(responseText(response)).toContain('CSS content NOT included');
  });

  it('sorts tokens into buckets', async () => {
    const { tokens } = parseToolResponse(await handleGetExternalCSS({ cssUrl: '/main.css' }));

    expect(tokens.colors).toEqual({ '--color-primary': '#0055ff' });
    expect(tokens.spacing).toEqual({ '--spacing-md': '16px' });
    expect(tokens.typography).toEqual({ '--font-family-base': 'Inter, sans-serif' });
    expect(tokens.shadows).toEqual({ '--shadow-card': '0 1px 2px rgba(0,0,0,.1)' });
    expect(tokens.radii).toEqual({ '--border-style': 'solid' });
    expect(tokens.breakpoints).toEqual({ '--breakpoint-lg': 'xl' });
    expect(tokens.other).toEqual({ '--transition-fast': 'ease-in' });
  });

  it('can skip token extraction', async () => {
    const data = parseToolResponse(
      await handleGetExternalCSS({ cssUrl: '/main.css', extractTokens: false })
    );

    expect(data.tokensExtracted).toBe(false);
    expect(data.tokenCount).toBe(0);
    expect(data.tokens).toBeNull();
    // Statistics are computed either way.
    expect(data.analysis.customProperties).toBe(7);
  });

  it('reports rule, media-query and declaration counts', async () => {
    const { analysis } = parseToolResponse(await handleGetExternalCSS({ cssUrl: '/main.css' }));

    expect(analysis.mediaQueries).toBe(1);
    expect(analysis.totalRules).toBeGreaterThan(0);
    expect(analysis.declarations).toBeGreaterThan(0);
  });

  it('formats the file size in human units', async () => {
    fetchMock.mockResolvedValue(cssResponse('a'.repeat(2048)));

    const data = parseToolResponse(await handleGetExternalCSS({ cssUrl: '/main.css' }));

    expect(data.fileSize).toBe(2048);
    expect(data.fileSizeFormatted).toBe('2 KB');
  });

  it('reports an empty file as 0 Bytes', async () => {
    fetchMock.mockResolvedValue(cssResponse(''));

    expect(
      parseToolResponse(await handleGetExternalCSS({ cssUrl: '/main.css' })).fileSizeFormatted
    ).toBe('0 Bytes');
  });
});

describe('handleGetExternalCSS — full CSS mode', () => {
  it('returns the whole file when it fits', async () => {
    const data = parseToolResponse(
      await handleGetExternalCSS({ cssUrl: '/main.css', includeFullCSS: true })
    );

    expect(data.content).toBe(CSS);
    expect(data.truncated).toBe(false);
    expect(data.displayedSize).toBe(CSS.length);
  });

  it('truncates past maxContentSize and says so', async () => {
    const data = parseToolResponse(
      await handleGetExternalCSS({ cssUrl: '/main.css', includeFullCSS: true, maxContentSize: 20 })
    );

    expect(data.truncated).toBe(true);
    expect(data.displayedSize).toBe(20);
    expect(data.content).toContain('Content truncated due to size limit');
    expect(data.truncationWarning).toContain('Use maxContentSize parameter');
  });

  it('flags truncation in the summary line too', async () => {
    const text = responseText(
      await handleGetExternalCSS({ cssUrl: '/main.css', includeFullCSS: true, maxContentSize: 20 })
    );

    expect(text).toContain('TRUNCATED due to size');
    expect(text).toContain('design tokens extracted');
  });
});

describe('handleGetExternalCSS — failures', () => {
  it('reports an HTTP failure with its status', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 404, statusText: 'Not Found' });

    const text = responseText(await handleGetExternalCSS({ cssUrl: '/missing.css' }));

    expect(text).toContain('Status: 404');
  });

  it('reports a network failure', async () => {
    fetchMock.mockRejectedValue(new Error('connect ECONNREFUSED'));

    expect(responseText(await handleGetExternalCSS({ cssUrl: '/main.css' }))).toContain(
      'connect ECONNREFUSED'
    );
  });

  it('names an aborted request as a timeout', async () => {
    fetchMock.mockRejectedValue(Object.assign(new Error('aborted'), { name: 'AbortError' }));

    expect(responseText(await handleGetExternalCSS({ cssUrl: '/main.css' }))).toContain(
      '[TIMEOUT_ERROR]'
    );
  });
});
