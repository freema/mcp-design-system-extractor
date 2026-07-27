import puppeteer, { Browser } from 'puppeteer';
import { ComponentHTML } from '../types/storybook.js';

/**
 * Whether #storybook-root holds a rendered story rather than a placeholder.
 *
 * This used to require more than 100 characters of HTML, which quietly failed
 * most of a design system: a rendered button is around 76 characters, and
 * badges, chips, icons and inputs are smaller still. Any content that is not
 * Storybook's own "no preview" placeholder counts as rendered.
 */
export function isRenderedStory(content: string): boolean {
  const trimmed = content.trim();
  if (!trimmed) {
    return false;
  }
  return !trimmed.includes('sb-nopreview') && !trimmed.includes('No Preview');
}

export class PuppeteerClient {
  private browser: Browser | null = null;

  async launch(): Promise<void> {
    if (this.browser) {
      return; // Already launched
    }

    this.browser = await puppeteer.launch({
      headless: true,
      // @ts-expect-error ignoreHTTPSErrors is valid but not in LaunchOptions type
      ignoreHTTPSErrors: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--ignore-certificate-errors',
        '--ignore-certificate-errors-spki-list',
        '--disable-features=VizDisplayCompositor',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-blink-features=AutomationControlled',
        '--no-first-run',
        '--no-default-browser-check',
        '--no-zygote',
        '--single-process',
      ],
    });
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async fetchComponentHTML(
    url: string,
    storyId: string,
    waitMs: number = 8000
  ): Promise<ComponentHTML> {
    if (!this.browser) {
      throw new Error('PuppeteerClient not launched. Call launch() first.');
    }

    // A page per call. The job queue runs maxConcurrent = 2, and a shared page
    // meant two simultaneous fetches navigated the same tab — whichever
    // started second tore the first one's document out from under it, so one
    // of the pair reliably failed. Pages are cheap; the browser stays shared.
    const page = await this.browser.newPage();
    page.setDefaultTimeout(30000);

    try {
      // Navigate to the page
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

      // Poll #storybook-root until the story renders. Bounded by a deadline
      // rather than an attempt count: the old 15 x 1s loop could run for 15s
      // against a 10s caller timeout, so a slow story always failed as a
      // timeout instead of a useful error.
      const deadline = Date.now() + waitMs;
      let finalContent: string | null = null;
      let polls = 0;

      for (;;) {
        polls++;
        const content = await page.$eval('#storybook-root', el => el.innerHTML).catch(() => null);

        if (content !== null && isRenderedStory(content)) {
          finalContent = content;
          break;
        }

        if (Date.now() >= deadline) {
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (finalContent === null) {
        throw new Error(
          `Could not load story content for ${storyId} after ${polls} polls over ${waitMs}ms. The story may be misconfigured or still loading.`
        );
      }

      // Extract styles
      const styles = await page.$$eval('style', elements =>
        elements.map(el => el.textContent).filter(Boolean)
      );

      // Add external stylesheets info
      const externalStyles = await page.$$eval('link[rel="stylesheet"]', elements =>
        elements.map(el => `/* External stylesheet: ${el.getAttribute('href')} */`)
      );

      const allStyles = [...styles, ...externalStyles];

      // Extract CSS classes
      const classes = await page.$eval('#storybook-root', el => {
        const allElements = el.querySelectorAll('*');
        const classSet = new Set<string>();
        allElements.forEach((elem: any) => {
          if (elem.className && typeof elem.className === 'string') {
            elem.className.split(' ').forEach((cls: string) => {
              const trimmed = cls.trim();
              if (trimmed) {
                classSet.add(trimmed);
              }
            });
          }
        });
        return Array.from(classSet);
      });

      return {
        storyId,
        html: finalContent,
        styles: allStyles,
        classes,
      };
    } catch (error: any) {
      throw new Error(
        `Failed to fetch component HTML for ${storyId} using Puppeteer: ${error.message}`,
        { cause: error }
      );
    } finally {
      // Every call opens its own tab, so every call has to close it — one
      // leaked page per request would grow until the browser fell over.
      await page.close().catch(() => {});
    }
  }
}
