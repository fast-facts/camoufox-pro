import type { BrowserContext, Page } from '..';

export class Plugin {
  protected browser: BrowserContext | null = null;
  private initialized = false;
  private startCounter = 0;
  private teardowns: (() => void)[] = [];
  protected dependencies: Plugin[] = [];

  get isInitialized() { return this.initialized; }
  get isStopped() { return this.startCounter === 0; }

  async addDependency(plugin: Plugin) {
    this.dependencies.push(plugin);
  }

  async init(browser: BrowserContext) {
    if (this.initialized) return;

    this.browser = browser;

    const onBrowserClose = async () => {
      this.unbind();
      this.browser = null;
      this.initialized = false;
      this.startCounter = 0;
      await this.onClose();
    };
    browser.browserEvents.once('close', onBrowserClose);
    this.teardowns.push(() => browser.browserEvents.off('close', onBrowserClose));

    this.startCounter++;

    const checkStopped = (fn: (...args: any[]) => void): (...args: any[]) => void => {
      return (...args: any[]) => {
        if (this.isStopped) return;
        fn(...args);
      };
    };

    const thisOnPageCreated = checkStopped(this.onPageCreated.bind(this));
    browser.on('page', thisOnPageCreated);
    this.teardowns.push(() => browser.off('page', thisOnPageCreated));

    this.initialized = true;

    await Promise.all(this.dependencies.map(x => x.init(browser)));

    return this.afterLaunch(browser);
  }

  async remove() {
    await this.stop();
    await Promise.all(this.dependencies.map(x => x.remove()));
    this.unbind();
    this.browser = null;
    this.initialized = false;
    this.startCounter = 0;
  }

  private unbind() {
    for (const teardown of this.teardowns) teardown();
    this.teardowns = [];
  }

  protected async afterLaunch(_browser: BrowserContext) { null; }
  protected async onClose() { null; }

  protected async onPageCreated(_page: Page) { null; }

  protected async beforeRestart() { null; }
  async restart() {
    if (!this.isStopped) return;
    if (!this.initialized || !this.browser) return;

    await this.beforeRestart();

    this.startCounter++;
    await Promise.all(this.dependencies.map(x => x.restart()));

    await this.afterRestart();
  }

  protected async afterRestart() { null; }

  protected async beforeStop() { null; }
  async stop() {
    if (this.isStopped) return;

    await this.beforeStop();

    this.startCounter--;

    await Promise.all(this.dependencies.map(x => x.stop()));

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
