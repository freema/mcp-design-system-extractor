import { parse } from 'node-html-parser';
import { Window } from 'happy-dom';
import { StorybookIndex, ComponentHTML } from '../types/storybook.js';

export class StorybookClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.STORYBOOK_URL || 'https://aqua-design-system.vlp.cz';
    
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
          const text = await response.text();
          
          if (!text || text.trim() === '') {
            console.error(`Empty response from ${url}`);
            continue;
          }
          
          let data;
          try {
            data = JSON.parse(text);
          } catch (parseError) {
            console.error(`Failed to parse JSON from ${url}:`, parseError);
            console.error(`Response text: ${text.substring(0, 200)}...`);
            continue;
          }
          
          const storiesData = data.stories || data.entries;
          console.log(`Successfully fetched ${url}, data structure:`, {
            hasStories: !!storiesData,
            storyCount: storiesData ? Object.keys(storiesData).length : 0,
            version: data.v,
            format: data.stories ? 'v3 (stories)' : data.entries ? 'v4 (entries)' : 'unknown',
            sampleKeys: storiesData ? Object.keys(storiesData).slice(0, 3) : []
          });
          
          return data as StorybookIndex;
        } else {
          console.error(`HTTP ${response.status} ${response.statusText} for ${url}`);
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
      
      // Parse with node-html-parser first to check content
      const root = parse(html);
      
      // Check if content is already there (static HTML)
      const storyRoot = root.querySelector('#storybook-root') || root.querySelector('#root');
      if (storyRoot && storyRoot.innerHTML.trim()) {
        const componentHTML = storyRoot.innerHTML;
        const styles = this.extractStyles(root);
        const classes = this.extractClasses(componentHTML);
        
        return {
          storyId,
          html: componentHTML,
          styles,
          classes
        };
      }
      
      // If no static content, use Happy-DOM for dynamic content
      const window = new Window({
        url,
        settings: {
          enableFileSystemHttpRequests: false,
          disableJavaScriptFileLoading: false,
          disableJavaScriptEvaluation: false,
          enableConsoleCapturing: false
        }
      });
      
      try {
        window.document.write(html);
        
        // Wait for scripts to load and execute
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Try to find the story content
        const selectors = ['#storybook-root', '#storybook-docs', '#root'];
        let rootElement = null;
        
        for (const selector of selectors) {
          const element = window.document.querySelector(selector);
          if (element && element.innerHTML.trim()) {
            rootElement = element;
            break;
          }
        }
        
        if (!rootElement || !rootElement.innerHTML.trim()) {
          // One more short wait
          await new Promise(resolve => setTimeout(resolve, 500));
          
          for (const selector of selectors) {
            const element = window.document.querySelector(selector);
            if (element && element.innerHTML.trim()) {
              rootElement = element;
              break;
            }
          }
        }
        
        if (!rootElement || !rootElement.innerHTML.trim()) {
          throw new Error(`Could not find story content for ${storyId}`);
        }
        
        // Extract styles
        const styles: string[] = [];
        window.document.querySelectorAll('style').forEach((style: any) => {
          if (style.textContent) {
            styles.push(style.textContent);
          }
        });
        
        window.document.querySelectorAll('link[rel="stylesheet"]').forEach((link: any) => {
          const href = link.getAttribute('href');
          if (href) {
            styles.push(`/* External stylesheet: ${href} */`);
          }
        });
        
        const componentHTML = rootElement.innerHTML;
        const classes = this.extractClasses(componentHTML);
        
        return {
          storyId,
          html: componentHTML,
          styles,
          classes
        };
      } finally {
        window.close();
      }
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