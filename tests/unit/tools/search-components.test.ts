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

const { handleSearchComponents } = await import('../../../src/tools/search-components.js');

const names = (response: any) => {
  const data = parseToolResponse(response);
  return (Array.isArray(data) ? data : data.components).map((c: any) => c.name);
};

beforeEach(() => {
  stub = createStorybookClientStub();
});

describe('handleSearchComponents', () => {
  it('matches on name, title or category by default', async () => {
    expect(names(await handleSearchComponents({ query: 'button' }))).toEqual(['Button']);
    expect(names(await handleSearchComponents({ query: 'forms' }))).toEqual(['Input']);
  });

  it('is case-insensitive and matches partial words', async () => {
    expect(names(await handleSearchComponents({ query: 'BUT' }))).toEqual(['Button']);
  });

  it('honours searchIn: name', async () => {
    // "Components" is in every title but in no component name.
    expect(names(await handleSearchComponents({ query: 'Components', searchIn: 'name' }))).toEqual(
      []
    );
    expect(names(await handleSearchComponents({ query: 'Components', searchIn: 'title' }))).toEqual(
      ['Button', 'Input']
    );
  });

  it('honours searchIn: category and skips uncategorised components', async () => {
    const result = names(
      await handleSearchComponents({ query: 'components', searchIn: 'category' })
    );

    expect(result).toEqual(['Button', 'Input']);
    expect(result).not.toContain('Alert');
  });

  it('treats * as list-everything', async () => {
    expect(names(await handleSearchComponents({ query: '*' }))).toEqual([
      'Alert',
      'Button',
      'Input',
    ]);
    expect(names(await handleSearchComponents({ query: '.*' }))).toHaveLength(3);
  });

  it('searches by predefined purpose and returns its description', async () => {
    const response = await handleSearchComponents({ purpose: 'buttons' });
    const data = parseToolResponse(response);

    expect(data.description).toBe('Interactive button components');
    expect(data.components.map((c: any) => c.name)).toEqual(['Button']);
  });

  it('maps an unknown purpose to word patterns', async () => {
    const data = parseToolResponse(await handleSearchComponents({ purpose: 'alert danger' }));

    expect(data.description).toBe('Components related to alert danger');
    expect(data.components.map((c: any) => c.name)).toEqual(['Alert']);
  });

  it('ANDs query and purpose together', async () => {
    // "feedback" matches Alert; the query narrows it to nothing.
    expect(names(await handleSearchComponents({ purpose: 'feedback', query: 'button' }))).toEqual(
      []
    );
    expect(names(await handleSearchComponents({ purpose: 'feedback', query: 'alert' }))).toEqual([
      'Alert',
    ]);
  });

  it('requires either a query or a purpose', async () => {
    const text = responseText(await handleSearchComponents({}));

    expect(text).toMatch(/^Error:/);
    expect(text).toContain('Either query or purpose must be provided');
  });

  it('rejects an empty query with no purpose', async () => {
    // Passes validation (a string is a string) but there is nothing to match.
    const text = responseText(await handleSearchComponents({ query: '' }));

    expect(text).toContain('At least one of "query" or "purpose" parameter is required');
  });

  it('paginates results', async () => {
    const response = await handleSearchComponents({ query: '*', pageSize: 2 });

    expect(responseText(response)).toContain('showing page 1/2');
    expect(names(response)).toEqual(['Alert', 'Button']);
  });

  it('reports no matches as an empty list, not an error', async () => {
    const response = await handleSearchComponents({ query: 'nonexistent' });

    expect(responseText(response)).not.toMatch(/^Error:/);
    expect(names(response)).toEqual([]);
  });

  it('tolerates an index with neither stories nor entries', async () => {
    stub.fetchStoriesIndex.mockResolvedValue({ v: 5 } as any);

    expect(names(await handleSearchComponents({ query: '*' }))).toEqual([]);
  });

  it('surfaces a fetch failure as an error response', async () => {
    stub.fetchStoriesIndex.mockRejectedValue(new Error('connect ECONNREFUSED'));

    expect(responseText(await handleSearchComponents({ query: '*' }))).toMatch(/^Error:/);
  });
});
