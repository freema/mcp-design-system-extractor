import { describe, it, expect } from 'vitest';

import {
  mapStoriesToComponents,
  getComponentsArray,
  toCompactComponent,
  toCompactComponents,
} from '../../../src/utils/story-mapper.js';

const story = (id: string, title: string, name: string) => ({ id, title, name });

const stories = {
  'components-button--primary': story('components-button--primary', 'Components/Button', 'Primary'),
  'components-button--secondary': story(
    'components-button--secondary',
    'Components/Button',
    'Secondary'
  ),
  'components-forms-input--default': story(
    'components-forms-input--default',
    'Components/Forms/Input',
    'Default'
  ),
  'alert--default': story('alert--default', 'Alert', 'Default'),
};

describe('mapStoriesToComponents', () => {
  it('groups stories by component and derives id, name and category', () => {
    const map = mapStoriesToComponents(stories);

    expect([...map.keys()].sort()).toEqual(['Alert', 'Button', 'Input']);

    const button = map.get('Button')!;
    expect(button.id).toBe('components-button');
    expect(button.title).toBe('Components/Button');
    expect(button.category).toBe('Components');
    expect(button.stories).toHaveLength(2);

    const input = map.get('Input')!;
    expect(input.category).toBe('Components/Forms');
  });

  it('leaves category unset for a top-level story', () => {
    const alert = mapStoriesToComponents(stories).get('Alert')!;

    expect(alert.name).toBe('Alert');
    expect(alert.category).toBeUndefined();
  });

  it('accepts an array as well as a keyed object', () => {
    const fromArray = mapStoriesToComponents(Object.values(stories));
    const fromObject = mapStoriesToComponents(stories);

    expect([...fromArray.keys()]).toEqual([...fromObject.keys()]);
  });

  it('applies the filter before grouping', () => {
    const map = mapStoriesToComponents(stories, {
      filterFn: (_story, _name, category) => category === 'Components',
    });

    expect([...map.keys()]).toEqual(['Button']);
  });

  it('passes the derived name and category to the filter', () => {
    const seen: Array<[string, string | undefined]> = [];
    mapStoriesToComponents(stories, {
      filterFn: (_story, name, category) => {
        seen.push([name, category]);
        return false;
      },
    });

    expect(seen).toContainEqual(['Input', 'Components/Forms']);
    expect(seen).toContainEqual(['Alert', undefined]);
  });

  it('keys by lowercased title when asked, so same-named components stay apart', () => {
    // Two different "Button" components under different paths collapse into one
    // entry under the default name key. Keying by title keeps them separate.
    const collision = {
      a: story('core-button--default', 'Core/Button', 'Default'),
      b: story('legacy-button--default', 'Legacy/Button', 'Default'),
    };

    expect(mapStoriesToComponents(collision).size).toBe(1);

    const byTitle = mapStoriesToComponents(collision, { useComponentKey: 'title' });
    expect(byTitle.size).toBe(2);
    expect([...byTitle.keys()].sort()).toEqual(['core/button', 'legacy/button']);
  });

  it('falls back to the whole id when there is no variant suffix', () => {
    const map = mapStoriesToComponents([story('standalone', 'Standalone', 'Default')]);

    expect(map.get('Standalone')!.id).toBe('standalone');
  });
});

describe('getComponentsArray', () => {
  it('sorts components by name', () => {
    const names = getComponentsArray(mapStoriesToComponents(stories)).map(c => c.name);

    expect(names).toEqual(['Alert', 'Button', 'Input']);
  });
});

describe('toCompactComponent', () => {
  it('replaces the story list with a count', () => {
    const button = mapStoriesToComponents(stories).get('Button')!;

    expect(toCompactComponent(button)).toEqual({
      id: 'components-button',
      name: 'Button',
      title: 'Components/Button',
      category: 'Components',
      variantCount: 2,
    });
  });

  it('omits category when the component has none', () => {
    const alert = mapStoriesToComponents(stories).get('Alert')!;

    expect(toCompactComponent(alert)).not.toHaveProperty('category');
  });

  it('reports zero variants when stories are missing', () => {
    const compact = toCompactComponent({ id: 'x', name: 'X', title: 'X' } as any);

    expect(compact.variantCount).toBe(0);
  });

  it('maps a whole array', () => {
    const components = getComponentsArray(mapStoriesToComponents(stories));

    expect(toCompactComponents(components).map(c => c.variantCount)).toEqual([1, 2, 1]);
  });
});
