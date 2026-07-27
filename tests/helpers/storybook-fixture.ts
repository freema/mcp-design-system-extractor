import { vi } from 'vitest';

import type { ComponentHTML } from '../../src/types/storybook.js';

export interface FixtureStory {
  id: string;
  title: string;
  name: string;
}

/**
 * A small but representative Storybook index: two variants of one component,
 * a nested category, and a story with no category at all.
 */
export const STORY_ENTRIES: Record<string, FixtureStory> = {
  'components-button--primary': {
    id: 'components-button--primary',
    title: 'Components/Button',
    name: 'Primary',
  },
  'components-button--default': {
    id: 'components-button--default',
    title: 'Components/Button',
    name: 'Default',
  },
  'components-forms-input--default': {
    id: 'components-forms-input--default',
    title: 'Components/Forms/Input',
    name: 'Default',
  },
  'alert--danger': { id: 'alert--danger', title: 'Alert', name: 'Danger' },
};

export const COMPONENT_HTML: ComponentHTML = {
  storyId: 'components-button--primary',
  html: '<button class="btn btn--primary">Click me</button>',
  styles: ['.sb-show-main { padding: 0; }', '.btn { color: red; }'],
  classes: ['btn', 'btn--primary'],
};

export interface StorybookClientStub {
  fetchStoriesIndex: ReturnType<typeof vi.fn>;
  fetchComponentHTML: ReturnType<typeof vi.fn>;
  getStorybookUrl: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
}

/**
 * Fresh stub per test. `StorybookClient` is constructed inside the handlers,
 * so the module mock has to hand back whichever stub the current test set up.
 */
export function createStorybookClientStub(): StorybookClientStub {
  return {
    fetchStoriesIndex: vi.fn().mockResolvedValue({ v: 5, entries: STORY_ENTRIES }),
    fetchComponentHTML: vi.fn().mockResolvedValue(COMPONENT_HTML),
    getStorybookUrl: vi.fn().mockReturnValue('http://localhost:6006'),
    close: vi.fn().mockResolvedValue(undefined),
  };
}

/**
 * A stand-in `StorybookClient` that forwards to whatever stub the current test
 * installed. The job queue caches its client for the lifetime of the process,
 * so returning the stub object directly would pin the very first test's stub
 * into the singleton and every later test would assert against a dead mock.
 */
export function delegatingClient(current: () => StorybookClientStub) {
  return {
    fetchStoriesIndex: (...args: any[]) => current().fetchStoriesIndex(...args),
    fetchComponentHTML: (...args: any[]) => current().fetchComponentHTML(...args),
    getStorybookUrl: (...args: any[]) => current().getStorybookUrl(...args),
    close: (...args: any[]) => current().close(...args),
  };
}

/** Parse the JSON payload a tool response carries after its message line. */
export function parseToolResponse(response: { content: Array<{ text: string }> }): any {
  const text = response.content[0]!.text;
  const start = text.indexOf('\n\n');
  return JSON.parse(start === -1 ? text : text.slice(start + 2));
}

export function responseText(response: { content: Array<{ text: string }> }): string {
  return response.content[0]!.text;
}
