import { parse } from 'node-html-parser';
import { StorybookIndex, ComponentHTML } from '../types/storybook.js';

export class StorybookClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.STORYBOOK_URL || 'http://localhost:6006';
    
    if (!this.baseUrl.startsWith('http')) {
      throw new Error('STORYBOOK_URL must start with http:// or https://');
    }
    
    this.baseUrl = this.baseUrl.replace(/\/$/, '');
  }

  async fetchStoriesIndex(): Promise<StorybookIndex> {
    const urls = ['/index.json', '/stories.json'];
    
    for (const url of urls) {
      try {
        const response = await fetch(`${this.baseUrl}${url}`);
        if (response.ok) {
          const data = await response.json();
          return data as StorybookIndex;
        }
      } catch (error) {
        console.error(`Failed to fetch ${url}:`, error);
      }
    }
    
    throw new Error(`Could not fetch stories index from ${this.baseUrl}. Tried: ${urls.join(', ')}`);
  }

  async fetchComponentHTML(storyId: string): Promise<ComponentHTML> {
    try {
      const url = `${this.baseUrl}/iframe.html?id=${encodeURIComponent(storyId)}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch story ${storyId}: ${response.status} ${response.statusText}`);
      }
      
      const html = await response.text();
      const root = parse(html);
      
      const storyRoot = root.querySelector('#storybook-root') || root.querySelector('#root');
      if (!storyRoot) {
        throw new Error(`Could not find story root element for ${storyId}`);
      }
      
      const componentHTML = storyRoot.innerHTML;
      const styles = this.extractStyles(root);
      const classes = this.extractClasses(componentHTML);
      
      return {
        storyId,
        html: componentHTML,
        styles,
        classes
      };
    } catch (error) {
      throw new Error(`Failed to fetch component HTML for ${storyId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/iframe.html`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  getStorybookUrl(): string {
    return this.baseUrl;
  }

  private extractStyles(root: any): string[] {
    const styles: string[] = [];
    
    const styleElements = root.querySelectorAll('style');
    styleElements.forEach((style: any) => {
      if (style.innerHTML && style.innerHTML.trim()) {
        styles.push(style.innerHTML.trim());
      }
    });
    
    const linkElements = root.querySelectorAll('link[rel="stylesheet"]');
    linkElements.forEach((link: any) => {
      const href = link.getAttribute('href');
      if (href) {
        styles.push(`/* External stylesheet: ${href} */`);
      }
    });
    
    return styles;
  }

  private extractClasses(html: string): string[] {
    const classRegex = /class="([^"]*)"/g;
    const classes = new Set<string>();
    
    let match;
    while ((match = classRegex.exec(html)) !== null) {
      if (match[1]) {
        const classNames = match[1].split(/\s+/).filter(Boolean);
        classNames.forEach(className => classes.add(className));
      }
    }
    
    return Array.from(classes).sort();
  }
}