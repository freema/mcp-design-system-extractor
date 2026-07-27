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

const { handleGetComponentDependencies } =
  await import('../../../src/tools/get-component-dependencies.js');

const withHTML = (html: string) => {
  stub.fetchComponentHTML.mockResolvedValue({
    storyId: 'card--default',
    html,
    styles: [],
    classes: [],
  });
  return handleGetComponentDependencies({ componentId: 'card--default' });
};

beforeEach(() => {
  stub = createStorybookClientStub();
});

describe('handleGetComponentDependencies', () => {
  it('finds React-style, web and framework components', async () => {
    const data = parseToolResponse(
      await withHTML(
        '<Card><CardHeader /><my-avatar size="s"></my-avatar><app-footer></app-footer></Card>'
      )
    );

    expect(data.dependencies).toEqual(['Card', 'CardHeader', 'app-footer', 'my-avatar']);
  });

  it('ignores plain HTML elements', async () => {
    const data = parseToolResponse(
      await withHTML('<div><span><button type="button">x</button><svg><path /></svg></span></div>')
    );

    expect(data.dependencies).toEqual([]);
  });

  it('splits library components out from in-house ones', async () => {
    const data = parseToolResponse(
      await withHTML('<MuiButton /><AntTable /><Card /><BootstrapModal />')
    );

    expect(data.externalComponents).toEqual(['AntTable', 'BootstrapModal', 'MuiButton']);
    // "Button" is the Mui prefix stripped off MuiButton by the class-name
    // heuristic; it is reported alongside the tag it came from.
    expect(data.internalComponents).toEqual(['Button', 'Card']);
  });

  it('infers components from class-name conventions', async () => {
    const data = parseToolResponse(
      await withHTML(
        '<div class="MuiPaper-root"><span class="Button-root"></span><i class="component-icon"></i></div>'
      )
    );

    // `MuiPaper-root` yields both the full name and the Mui-stripped one.
    expect(data.dependencies).toEqual(['Button', 'MuiPaper', 'Paper', 'icon']);
  });

  it('de-duplicates repeated usages', async () => {
    const data = parseToolResponse(await withHTML('<Chip /><Chip /><Chip />'));

    expect(data.dependencies).toEqual(['Chip']);
  });

  it('echoes the story id it analysed', async () => {
    const data = parseToolResponse(await withHTML('<Card />'));

    expect(data.storyId).toBe('card--default');
  });

  it('requires componentId', async () => {
    expect(responseText(await handleGetComponentDependencies({}))).toMatch(/^Error:/);
  });

  it('surfaces a fetch failure as an error response', async () => {
    stub.fetchComponentHTML.mockRejectedValue(new Error('Story not found'));

    expect(
      responseText(await handleGetComponentDependencies({ componentId: 'ghost--default' }))
    ).toBe('Error: Story not found');
  });
});
