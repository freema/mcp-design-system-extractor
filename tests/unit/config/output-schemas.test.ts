import { describe, it, expect, vi, beforeEach } from 'vitest';

import { OUTPUT_SCHEMAS } from '../../../src/config/output-schemas.js';
import {
  createStorybookClientStub,
  delegatingClient,
  type StorybookClientStub,
} from '../../helpers/storybook-fixture.js';

let stub: StorybookClientStub;

vi.mock('../../../src/utils/storybook-client.js', () => ({
  StorybookClient: vi.fn(function () {
    return delegatingClient(() => stub);
  }),
}));

const toolsModule = await import('../../../src/tools/index.js');

const TOOL_DEFINITIONS = [
  toolsModule.listComponentsTool,
  toolsModule.getComponentHTMLTool,
  toolsModule.searchComponentsTool,
  toolsModule.getComponentDependenciesTool,
  toolsModule.getThemeInfoTool,
  toolsModule.getExternalCSSTool,
  toolsModule.jobStatusTool,
  toolsModule.jobCancelTool,
  toolsModule.jobListTool,
];

/** Minimal check of the subset of JSON Schema these declarations use. */
function violations(schema: any, value: unknown, path = '$'): string[] {
  if (!schema || typeof schema !== 'object') {
    return [];
  }

  const problems: string[] = [];
  const actual = Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value;

  if (schema.type && schema.type !== actual) {
    return [`${path}: expected ${schema.type}, got ${actual}`];
  }

  if (schema.enum && !schema.enum.includes(value)) {
    problems.push(`${path}: ${JSON.stringify(value)} not in enum`);
  }

  if (schema.type === 'object' && value && typeof value === 'object') {
    for (const key of schema.required ?? []) {
      if (!(key in (value as object))) {
        problems.push(`${path}.${key}: required but missing`);
      }
    }
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      const childSchema = schema.properties?.[key] ?? schema.additionalProperties;
      if (childSchema) {
        problems.push(...violations(childSchema, child, `${path}.${key}`));
      }
    }
  }

  if (schema.type === 'array' && Array.isArray(value) && schema.items) {
    value.forEach((item, i) => problems.push(...violations(schema.items, item, `${path}[${i}]`)));
  }

  return problems;
}

const expectValid = (toolName: string, response: any) => {
  expect(response.structuredContent, `${toolName} returned no structuredContent`).toBeDefined();
  expect(violations(OUTPUT_SCHEMAS[toolName], response.structuredContent)).toEqual([]);
};

beforeEach(() => {
  stub = createStorybookClientStub();
});

describe('OUTPUT_SCHEMAS', () => {
  it('covers every tool the server exposes, and nothing else', () => {
    expect(Object.keys(OUTPUT_SCHEMAS).sort()).toEqual(TOOL_DEFINITIONS.map(t => t.name).sort());
  });

  it('declares each schema as a JSON Schema object', () => {
    for (const [name, schema] of Object.entries(OUTPUT_SCHEMAS)) {
      expect((schema as any).type, name).toBe('object');
    }
  });
});

describe('structured output matches the declared schema', () => {
  it('list_components', async () => {
    const response = await toolsModule.handleListComponents({});

    expectValid('list_components', response);
    expect((response as any).structuredContent.components).toHaveLength(3);
    expect((response as any).structuredContent.pagination.totalItems).toBe(3);
  });

  it('list_components with an empty Storybook', async () => {
    stub.fetchStoriesIndex.mockResolvedValue({ v: 5, entries: {} });

    expectValid('list_components', await toolsModule.handleListComponents({}));
  });

  it('search_components', async () => {
    expectValid('search_components', await toolsModule.handleSearchComponents({ query: '*' }));
  });

  it('search_components by purpose carries the description', async () => {
    const response: any = await toolsModule.handleSearchComponents({ purpose: 'buttons' });

    expectValid('search_components', response);
    expect(response.structuredContent.description).toBe('Interactive button components');
  });

  it('get_component_html in all three modes', async () => {
    expectValid(
      'get_component_html',
      await toolsModule.handleGetComponentHTML({
        componentId: 'components-button',
        variantsOnly: true,
      })
    );
    expectValid(
      'get_component_html',
      await toolsModule.handleGetComponentHTML({ componentId: 'components-button--primary' })
    );
    expectValid(
      'get_component_html',
      await toolsModule.handleGetComponentHTML({
        componentId: 'components-button--primary',
        async: false,
        includeStyles: true,
      })
    );
  });

  it('get_component_dependencies', async () => {
    stub.fetchComponentHTML.mockResolvedValue({
      storyId: 'card--default',
      html: '<Card><MuiButton /></Card>',
      styles: [],
      classes: [],
    });

    expectValid(
      'get_component_dependencies',
      await toolsModule.handleGetComponentDependencies({ componentId: 'card--default' })
    );
  });

  it('get_theme_info', async () => {
    stub.fetchComponentHTML.mockResolvedValue({
      storyId: 'alert--danger',
      html: '<div></div>',
      styles: [':root { --color-primary: #0055ff; }'],
      classes: [],
    });

    expectValid('get_theme_info', await toolsModule.handleGetThemeInfo({}));
  });

  it('get_external_css', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => ':root { --color-primary: #0055ff; }',
      })
    );

    expectValid('get_external_css', await toolsModule.handleGetExternalCSS({ cssUrl: '/a.css' }));
    vi.unstubAllGlobals();
  });

  it('job_status, job_list and job_cancel', async () => {
    const { job_id } = JSON.parse(
      (
        await toolsModule.handleGetComponentHTML({ componentId: 'alert--danger' })
      ).content[0]!.text!.split('\n\n')[1]!
    );

    expectValid('job_status', await toolsModule.handleJobStatus({ job_id }));
    expectValid('job_list', await toolsModule.handleJobList({}));
    expectValid('job_cancel', await toolsModule.handleJobCancel({ job_id }));
  });
});

describe('failed calls', () => {
  it('are flagged with isError and carry no structured payload', async () => {
    stub.fetchStoriesIndex.mockRejectedValue(new Error('connect ECONNREFUSED'));

    const response: any = await toolsModule.handleListComponents({});

    expect(response.isError).toBe(true);
    expect(response.structuredContent).toBeUndefined();
  });
});
