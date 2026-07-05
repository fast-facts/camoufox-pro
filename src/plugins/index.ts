import type { BrowserContext, Page } from '..';

export class Plugin {
  protected browser: BrowserContext | null = null;
  private initialized = false;
  private startCounter = 0;
  protected dependencies: Plugin[] = [];

  get isInitialized() { return this.initialized; }
  get isStopped() { return this.startCounter === 0; }

  async addDependency(plugin: Plugin) {
    this.dependencies.push(plugin);
  }

  async init(browser: BrowserContext) {
    if (this.initialized) return;

    this.browser = browser;

    const offOnClose: (() => void)[] = [];
    browser.browserEvents.once('close', async () => {
      offOnClose.forEach(fn => fn());

      this.browser = null;
      this.initialized = false;
      this.startCounter = 0;

      await this.onClose();
    });

    this.startCounter++;

    const checkStopped = <T>(fn: () => T): () => T | undefined => {
      return () => {
        if (this.isStopped) return;
        return fn();
      };
    };

    const thisOnPageCreated = checkStopped(this.onPageCreated.bind(this));
    browser.on('page', thisOnPageCreated);
    offOnClose.push(() => browser.off('page', thisOnPageCreated));

    this.initialized = true;

    this.dependencies.forEach(x => x.init(browser));

    return this.afterLaunch(browser);
  }

  protected async afterLaunch(_browser: BrowserContext) { null; }
  protected async onClose() { null; }

  protected async onPageCreated(_page: Page) { null; }

  protected async beforeRestart() { null; }
  async restart() {
    await this.beforeRestart();

    this.startCounter++;
    this.dependencies.forEach(x => x.restart());

    await this.afterRestart();
  }

  protected async afterRestart() { null; }

  protected async beforeStop() { null; }
  async stop() {
    await this.beforeStop();

    this.startCounter--;

    this.dependencies.forEach(x => x.stop());

    await this.afterStop();
  }

  protected async afterStop() { null; }

  protected async getFirstPage() {
    if (!this.browser) return null;

    const pages = await this.browser.pages();
    const openPages = pages.filter(x => !x.isClosed());
    const activePages = pages.filter(x => x.url() !== 'about:blank');

    return activePages[0] || openPages[0];
  }
}
