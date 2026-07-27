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

const { handleGetComponentHTML, getComponentHTMLTool } =
  await import('../../../src/tools/get-component-html.js');
const { jobQueue } = await import('../../../src/services/job-queue.js');

beforeEach(() => {
  stub = createStorybookClientStub();
});

describe('get_component_html tool definition', () => {
  it('requires only componentId', () => {
    expect(getComponentHTMLTool.inputSchema.required).toEqual(['componentId']);
  });
});

describe('handleGetComponentHTML — variantsOnly', () => {
  it('lists the variants of a component id', async () => {
    const data = parseToolResponse(
      await handleGetComponentHTML({ componentId: 'components-button', variantsOnly: true })
    );

    expect(data.componentId).toBe('components-button');
    expect(data.variants.sort()).toEqual(['default', 'primary']);
  });

  it('matches the component id case-insensitively', async () => {
    const data = parseToolResponse(
      await handleGetComponentHTML({ componentId: 'COMPONENTS-BUTTON', variantsOnly: true })
    );

    expect(data.variants).toHaveLength(2);
  });

  it('does not match a different component with a shared prefix', async () => {
    const text = responseText(
      await handleGetComponentHTML({ componentId: 'components', variantsOnly: true })
    );

    expect(text).toContain('No variants found for component: components');
  });

  it('reports an unknown component', async () => {
    const text = responseText(
      await handleGetComponentHTML({ componentId: 'nope', variantsOnly: true })
    );

    expect(text).toMatch(/^Error:/);
    expect(text).toContain('No variants found for component: nope');
  });

  it('never touches the browser path', async () => {
    await handleGetComponentHTML({ componentId: 'alert', variantsOnly: true });

    expect(stub.fetchComponentHTML).not.toHaveBeenCalled();
  });
});

describe('handleGetComponentHTML — async mode', () => {
  it('defaults to async and returns a queued job', async () => {
    const data = parseToolResponse(
      await handleGetComponentHTML({ componentId: 'components-button--primary' })
    );

    expect(data.job_id).toMatch(/^job_/);
    expect(data.status).toBe('queued');
    expect(data.component_id).toBe('components-button--primary');
  });

  it('hands the job id to job_status', async () => {
    const { job_id } = parseToolResponse(
      await handleGetComponentHTML({ componentId: 'components-button--primary' })
    );

    expect(jobQueue.getStatus(job_id)).not.toBeNull();
  });
});

describe('handleGetComponentHTML — sync mode', () => {
  it('returns the extracted HTML and classes', async () => {
    const data = parseToolResponse(
      await handleGetComponentHTML({ componentId: 'components-button--primary', async: false })
    );

    expect(data.storyId).toBe('components-button--primary');
    expect(data.html).toBe('<button class="btn btn--primary">Click me</button>');
    expect(data.classes).toEqual(['btn', 'btn--primary']);
  });

  it('omits styles unless asked', async () => {
    const data = parseToolResponse(
      await handleGetComponentHTML({ componentId: 'components-button--primary', async: false })
    );

    expect(data).not.toHaveProperty('styles');
  });

  it('filters Storybook boilerplate out of the returned styles', async () => {
    const data = parseToolResponse(
      await handleGetComponentHTML({
        componentId: 'components-button--primary',
        async: false,
        includeStyles: true,
      })
    );

    expect(data.styles).toEqual(['.btn { color: red; }']);
  });

  it('resolves a bare component id, preferring the --default story', async () => {
    await handleGetComponentHTML({ componentId: 'components-button', async: false });

    expect(stub.fetchComponentHTML).toHaveBeenCalledWith('components-button--default');
  });

  it('falls back to the first story when there is no --default', async () => {
    await handleGetComponentHTML({ componentId: 'alert', async: false });

    expect(stub.fetchComponentHTML).toHaveBeenCalledWith('alert--danger');
  });

  it('reports a component with no stories', async () => {
    const text = responseText(await handleGetComponentHTML({ componentId: 'ghost', async: false }));

    expect(text).toContain('No stories found for component: ghost');
  });

  it('surfaces an extraction failure as an error response', async () => {
    stub.fetchComponentHTML.mockRejectedValue(new Error('Navigation timeout'));

    const text = responseText(
      await handleGetComponentHTML({ componentId: 'components-button--primary', async: false })
    );

    expect(text).toMatch(/^Error:/);
    expect(text).toContain('Navigation timeout');
  });
});

describe('handleGetComponentHTML — validation', () => {
  it('requires componentId', async () => {
    expect(responseText(await handleGetComponentHTML({}))).toMatch(/^Error:/);
  });

  it('rejects a timeout outside the documented range', async () => {
    expect(
      responseText(await handleGetComponentHTML({ componentId: 'alert', timeout: 100 }))
    ).toMatch(/^Error:/);
    expect(
      responseText(await handleGetComponentHTML({ componentId: 'alert', timeout: 600000 }))
    ).toMatch(/^Error:/);
  });

  it('names the component in the error context when validation passes', async () => {
    stub.fetchStoriesIndex.mockRejectedValue(new Error('boom'));

    expect(
      responseText(await handleGetComponentHTML({ componentId: 'alert', variantsOnly: true }))
    ).toContain('alert');
  });
});
