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

const { handleListComponents, listComponentsTool } =
  await import('../../../src/tools/list-components.js');

beforeEach(() => {
  stub = createStorybookClientStub();
});

describe('list_components tool definition', () => {
  it('takes no required input', () => {
    expect(listComponentsTool.name).toBe('list_components');
    expect(listComponentsTool.inputSchema.required).toEqual([]);
  });
});

describe('handleListComponents', () => {
  it('returns every component in compact form by default', async () => {
    const data = parseToolResponse(await handleListComponents({}));

    expect(data).toEqual([
      { id: 'alert', name: 'Alert', title: 'Alert', variantCount: 1 },
      {
        id: 'components-button',
        name: 'Button',
        title: 'Components/Button',
        category: 'Components',
        variantCount: 2,
      },
      {
        id: 'components-forms-input',
        name: 'Input',
        title: 'Components/Forms/Input',
        category: 'Components/Forms',
        variantCount: 1,
      },
    ]);
  });

  it('includes the underlying stories when compact is false', async () => {
    const data = parseToolResponse(await handleListComponents({ compact: false }));

    expect(data[1].stories).toHaveLength(2);
    expect(data[1].stories[0]).toMatchObject({ id: 'components-button--primary' });
  });

  it('filters by exact category', async () => {
    const data = parseToolResponse(await handleListComponents({ category: 'Components' }));

    expect(data.map((c: any) => c.name)).toEqual(['Button']);
  });

  it('treats category "all" as no filter', async () => {
    const data = parseToolResponse(await handleListComponents({ category: 'all' }));

    expect(data).toHaveLength(3);
  });

  it('returns an empty list for a category nothing matches', async () => {
    const data = parseToolResponse(await handleListComponents({ category: 'Nope' }));

    expect(data).toEqual([]);
  });

  it('paginates and reports the page in the message', async () => {
    const response = await handleListComponents({ page: 2, pageSize: 2 });

    expect(responseText(response)).toContain('showing page 2/2');
    expect(parseToolResponse(response).map((c: any) => c.name)).toEqual(['Input']);
  });

  it('reports a page past the end as a failure rather than empty data', async () => {
    const text = responseText(await handleListComponents({ page: 9, pageSize: 2 }));

    expect(text).toMatch(/^Error:/);
    expect(text).toContain('exceeds total pages');
  });

  it('rejects a page size over the documented maximum', async () => {
    const text = responseText(await handleListComponents({ pageSize: 500 }));

    expect(text).toMatch(/^Error:/);
    expect(stub.fetchStoriesIndex).not.toHaveBeenCalled();
  });

  it('accepts a v3 index keyed under stories', async () => {
    stub.fetchStoriesIndex.mockResolvedValue({
      v: 3,
      stories: { 'alert--danger': { id: 'alert--danger', title: 'Alert', name: 'Danger' } },
    });

    expect(parseToolResponse(await handleListComponents({}))).toHaveLength(1);
  });

  it('explains an index with neither stories nor entries', async () => {
    stub.fetchStoriesIndex.mockResolvedValue({ v: 5 } as any);

    expect(responseText(await handleListComponents({}))).toContain('Invalid stories index');
  });

  it('reports an empty Storybook with its URL', async () => {
    stub.fetchStoriesIndex.mockResolvedValue({ v: 5, entries: {} });
    const response = await handleListComponents({});

    expect(responseText(response)).toContain('No components found');
    expect(responseText(response)).toContain('http://localhost:6006');
    expect(parseToolResponse(response)).toEqual([]);
  });

  it('surfaces a fetch failure as an error response, not a throw', async () => {
    stub.fetchStoriesIndex.mockRejectedValue(new Error('connect ECONNREFUSED 127.0.0.1:6006'));

    expect(responseText(await handleListComponents({}))).toMatch(/^Error:/);
  });
});
