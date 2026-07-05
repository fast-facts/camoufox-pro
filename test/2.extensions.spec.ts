import type * as Playwright from 'playwright-core';
import * as CamoufoxPro from '../src';
import type { BrowserContext } from '../src';
import { Plugin } from '../src/plugins';

const sleep = (time: number) => { return new Promise(resolve => { setTimeout(resolve, time); }); };

class TestPlugin extends Plugin {
  _state = false;

  async afterLaunch(browser: Playwright.BrowserContext) {
    const _newPage = browser.newPage;
    browser.newPage = async () => {
      const page = await _newPage.apply(browser);
      await sleep(100); // Sleep to allow user agent to set
      return page;
    };
  }

  async onPageCreated() { this.state = true; }

  get state() { return this._state; }
  set state(state) { this._state = state; }
}

const withLoaderTest = () => async (createBrowser: () => Promise<BrowserContext>) => {
  const browser = await createBrowser();

  try {
    const page = await browser.newPage();

    expect(page.withLoader).toBeDefined();
  } finally {
    if (browser) await browser.close();
  }
};

const pluginTests: PluginTests = {
  describe: 'CamoufoxPro\'s Page',
  tests: [{
    describe: 'can withLoader',
    tests: [withLoaderTest],
  }],
};

const runRecursiveTests = (x: PluginTests) => {
  if (x.describe && x.tests) {
    let performTest: (createBrowser: () => Promise<BrowserContext>) => Promise<void>;

    describe(x.describe, () => {
      for (const test of x.tests) {
        if (test instanceof Function) {
          let context: BrowserContext | undefined;

          beforeEach(async () => {
            const plugin = new TestPlugin();
            performTest = test(plugin);
          });

          afterEach(async () => {
            await context?.close();
            context = undefined;
          });

          it('on browser context', async () => {
            await performTest(() => CamoufoxPro!.launch());
          });
        } else {
          runRecursiveTests(test);
        }
      }
    });
  }
};

runRecursiveTests(pluginTests);

interface PluginTests {
  describe: string;
  tests: PluginTests[] | ((plugin: TestPlugin) => (createBrowser: () => Promise<BrowserContext>) => Promise<void>)[];
}
