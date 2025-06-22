import { ComponentInfo } from '../types/storybook.js';

export interface StoryMappingOptions {
  filterFn?: (story: any, componentName: string, category?: string) => boolean;
  useComponentKey?: 'name' | 'title';
}

export function mapStoriesToComponents(
  stories: Record<string, any> | any[],
  options: StoryMappingOptions = {}
): Map<string, ComponentInfo> {
  const { filterFn, useComponentKey = 'name' } = options;
  const componentMap = new Map<string, ComponentInfo>();
  
  const storyArray = Array.isArray(stories) ? stories : Object.values(stories);
  
  storyArray.forEach(story => {
    const componentName = story.title.split('/').pop() || story.title;
    const categoryParts = story.title.split('/').slice(0, -1);
    const category = categoryParts.length > 0 ? categoryParts.join('/') : undefined;
    
    // Apply filter if provided
    if (filterFn && !filterFn(story, componentName, category)) {
      return;
    }
    
    // Determine the key to use for the component map
    const mapKey = useComponentKey === 'title' 
      ? story.title.toLowerCase() 
      : componentName;
    
    if (!componentMap.has(mapKey)) {
      const componentInfo: ComponentInfo = {
        id: story.id.split('--')[0] || story.id,
        name: componentName,
        title: story.title,
        stories: [],
      };
      
      if (category) {
        componentInfo.category = category;
      }
      
      componentMap.set(mapKey, componentInfo);
    }
    
    componentMap.get(mapKey)!.stories.push(story);
  });
  
  return componentMap;
}

export function getComponentsArray(componentMap: Map<string, ComponentInfo>): ComponentInfo[] {
  return Array.from(componentMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}