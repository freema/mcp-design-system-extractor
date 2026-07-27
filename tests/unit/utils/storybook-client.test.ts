import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { STORY_ENTRIES } from '../../helpers/storybook-fixture.js';

const puppeteerInstances: Array<{
  launch: ReturnType<typeof vi.fn>;
  fetchComponentHTML: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
}> = [];

let launchBehaviour: () => Promise<void> = async () => {};

vi.mock('../../../src/utils/puppeteer-client.js', () => ({
  PuppeteerClient: vi.fn(function () {
    const instance = {
      launch: vi.fn(() => launchBehaviour()),
      fetchComponentHTML: vi.fn(async (_url: string, storyId: string) => ({
        storyId,
        html: '<button class="btn">Rendered</button>',
        styles: [],
        classes: ['btn'],
      })),
      close: vi.fn().mockResolvedValue(undefined),
    };
    puppeteerInstances.push(instance);
    return instance;
  }),
}));

const { StorybookClient } = await import('../../../src/utils/storybook-client.js');

const INDEX = { v: 5, entries: STORY_ENTRIES };

const iframeHTML = (inner: string) =>
  `<html><head><style>.btn { color: red; }</style></head>
   <body><div id="storybook-root">${inner}</div></body></html>`;

const jsonResponse = (body: unknown) => ({
  ok: true,
  status: 200,
  statusText: 'OK',
  json: async () => body,
});

const htmlResponse = (body: string) => ({
  ok: true,
  status: 200,
  statusText: 'OK',
  text: async () => body,
});

const failedResponse = (status: number, statusText: string) => ({
  ok: false,
  status,
  statusText,
});

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  puppeteerInstances.length = 0;
  launchBehaviour = async () => {};
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  delete process.env.STORYBOOK_URL;
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.STORYBOOK_URL;
});

describe('StorybookClient construction', () => {
  it('defaults to localhost:6006', () => {
    expect(new StorybookClient().getStorybookUrl()).toBe('http://localhost:6006');
  });

  it('reads STORYBOOK_URL from the environment', () => {
    process.env.STORYBOOK_URL = 'https://storybook.example.com';

    expect(new StorybookClient().getStorybookUrl()).toBe('https://storybook.example.com');
  });

  it('prefers an explicit base URL over the environment', () => {
    process.env.STORYBOOK_URL = 'https://env.example.com';

    expect(new StorybookClient('https://arg.example.com').getStorybookUrl()).toBe(
      'https://arg.example.com'
    );
  });

  it('strips a trailing slash so URLs do not double up', () => {
    expect(new StorybookClient('http://localhost:6006/').getStorybookUrl()).toBe(
      'http://localhost:6006'
    );
  });

  it('rejects a value that is not a URL', () => {
    expect(() => new StorybookClient('not a url')).toThrowError(
      'STORYBOOK_URL must be a valid URL starting with http:// or https://'
    );
  });

  it('rejects a bare host:port, which parses as a URL but has no scheme', () => {
    // `new URL('localhost:6006')` succeeds — "localhost:" reads as the scheme —
    // so this is caught by the http check rather than the parse.
    expect(() => new StorybookClient('localhost:6006')).toThrowError(
      'STORYBOOK_URL must start with http:// or https://'
    );
  });

  it('rejects a non-HTTP scheme', () => {
    expect(() => new StorybookClient('ftp://localhost:6006')).toThrowError(
      'STORYBOOK_URL must start with http:// or https://'
    );
  });
});

describe('fetchStoriesIndex', () => {
  it('reads index.json', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(INDEX));

    const index = await new StorybookClient().fetchStoriesIndex();

    expect(fetchMock.mock.calls[0]![0]).toBe('http://localhost:6006/index.json');
    expect(index).toEqual(INDEX);
  });

  it('falls back to stories.json for older Storybooks', async () => {
    fetchMock
      .mockResolvedValueOnce(failedResponse(404, 'Not Found'))
      .mockResolvedValueOnce(jsonResponse(INDEX));

    await new StorybookClient().fetchStoriesIndex();

    expect(fetchMock.mock.calls[1]![0]).toBe('http://localhost:6006/stories.json');
  });

  it('caches the index instead of refetching', async () => {
    fetchMock.mockResolvedValue(jsonResponse(INDEX));
    const client = new StorybookClient();

    await client.fetchStoriesIndex();
    await client.fetchStoriesIndex();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('reports both URLs failing with troubleshooting steps', async () => {
    fetchMock.mockResolvedValue(failedResponse(500, 'Internal Server Error'));

    await expect(new StorybookClient().fetchStoriesIndex()).rejects.toThrow(
      /Failed to fetch Storybook index from http:\/\/localhost:6006\..*HTTP 500/s
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('names a timeout as such', async () => {
    const abort = Object.assign(new Error('aborted'), { name: 'AbortError' });
    fetchMock.mockRejectedValue(abort);

    await expect(new StorybookClient().fetchStoriesIndex()).rejects.toThrow(
      /Request timeout while fetching/
    );
  });
});

describe('fetchComponentHTML', () => {
  const clientWithIndex = () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(INDEX));
    return new StorybookClient();
  };

  it('rejects a story id that is not in the index', async () => {
    const client = clientWithIndex();

    await expect(client.fetchComponentHTML('ghost--default')).rejects.toThrow(
      /\[NOT_FOUND_ERROR\]/
    );
  });

  it('uses statically rendered markup without starting a browser', async () => {
    const client = clientWithIndex();
    fetchMock.mockResolvedValueOnce(
      htmlResponse(iframeHTML('<button class="btn btn--primary">Click me</button>'))
    );

    const result = await client.fetchComponentHTML('components-button--primary');

    expect(result.html).toBe('<button class="btn btn--primary">Click me</button>');
    expect(result.classes).toEqual(['btn', 'btn--primary']);
    expect(result.styles).toEqual(['.btn { color: red; }']);
    expect(puppeteerInstances).toHaveLength(0);
  });

  it('encodes the story id in the iframe URL', async () => {
    const client = clientWithIndex();
    fetchMock.mockResolvedValueOnce(htmlResponse(iframeHTML('<b>x</b>')));

    await client.fetchComponentHTML('components-forms-input--default');

    expect(fetchMock.mock.calls[1]![0]).toBe(
      'http://localhost:6006/iframe.html?id=components-forms-input--default'
    );
  });

  it('falls back to the browser when the story renders client-side', async () => {
    const client = clientWithIndex();
    fetchMock.mockResolvedValueOnce(
      htmlResponse(iframeHTML('<div class="sb-nopreview">No Preview</div>'))
    );

    const result = await client.fetchComponentHTML('components-button--primary');

    expect(result.html).toBe('<button class="btn">Rendered</button>');
    expect(puppeteerInstances).toHaveLength(1);
    expect(puppeteerInstances[0]!.fetchComponentHTML).toHaveBeenCalledWith(
      'http://localhost:6006/iframe.html?id=components-button--primary',
      'components-button--primary'
    );
  });

  it('falls back to the browser when the root is empty', async () => {
    const client = clientWithIndex();
    fetchMock.mockResolvedValueOnce(htmlResponse(iframeHTML('   ')));

    await client.fetchComponentHTML('components-button--primary');

    expect(puppeteerInstances).toHaveLength(1);
  });

  it('launches the browser once for concurrent requests', async () => {
    const client = clientWithIndex();
    await client.fetchStoriesIndex();
    fetchMock.mockResolvedValue(htmlResponse(iframeHTML('<div class="sb-nopreview"></div>')));

    await Promise.all([
      client.fetchComponentHTML('components-button--primary'),
      client.fetchComponentHTML('components-button--default'),
      client.fetchComponentHTML('alert--danger'),
    ]);

    expect(puppeteerInstances).toHaveLength(1);
  });

  it('retries the launch after a failure instead of caching it', async () => {
    const client = clientWithIndex();
    await client.fetchStoriesIndex();
    fetchMock.mockResolvedValue(htmlResponse(iframeHTML('<div class="sb-nopreview"></div>')));
    launchBehaviour = async () => {
      throw new Error('Failed to launch the browser process');
    };

    await expect(client.fetchComponentHTML('components-button--primary')).rejects.toThrow(
      /CONNECTION_ERROR/
    );

    launchBehaviour = async () => {};
    await expect(client.fetchComponentHTML('alert--danger')).resolves.toMatchObject({
      storyId: 'alert--danger',
    });
    expect(puppeteerInstances).toHaveLength(2);
  });

  it('caches a story it has already extracted', async () => {
    const client = clientWithIndex();
    fetchMock.mockResolvedValueOnce(htmlResponse(iframeHTML('<b>x</b>')));

    await client.fetchComponentHTML('components-button--primary');
    await client.fetchComponentHTML('components-button--primary');

    // One index fetch plus one iframe fetch; the second call was served from cache.
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('reports an iframe that will not load, with its status', async () => {
    const client = clientWithIndex();
    fetchMock.mockResolvedValueOnce(failedResponse(502, 'Bad Gateway'));

    await expect(client.fetchComponentHTML('components-button--primary')).rejects.toThrow(
      /\[CONNECTION_ERROR\].*Status: 502/s
    );
  });

  it('reports a timeout against the story it was fetching', async () => {
    const client = clientWithIndex();
    fetchMock.mockRejectedValueOnce(Object.assign(new Error('aborted'), { name: 'AbortError' }));

    await expect(client.fetchComponentHTML('components-button--primary')).rejects.toThrow(
      /\[TIMEOUT_ERROR\].*for story components-button--primary/s
    );
  });
});

describe('close', () => {
  it('shuts the browser down and lets the next call start a new one', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(INDEX));
    const client = new StorybookClient();
    fetchMock.mockResolvedValue(htmlResponse(iframeHTML('<div class="sb-nopreview"></div>')));

    await client.fetchComponentHTML('components-button--primary');
    await client.close();

    expect(puppeteerInstances[0]!.close).toHaveBeenCalled();

    await client.fetchComponentHTML('alert--danger');
    expect(puppeteerInstances).toHaveLength(2);
  });

  it('is a no-op when no browser was ever started', async () => {
    await expect(new StorybookClient().close()).resolves.toBeUndefined();
    expect(puppeteerInstances).toHaveLength(0);
  });

  it('swallows a failed launch rather than throwing on shutdown', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(INDEX));
    const client = new StorybookClient();
    fetchMock.mockResolvedValue(htmlResponse(iframeHTML('<div class="sb-nopreview"></div>')));
    launchBehaviour = async () => {
      throw new Error('no browser');
    };

    await expect(client.fetchComponentHTML('components-button--primary')).rejects.toThrow();
    await expect(client.close()).resolves.toBeUndefined();
  });
});
