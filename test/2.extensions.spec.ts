import path from 'path';
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

const withLoaderTest = () => async (browser: BrowserContext) => {
  try {
    const page = await browser.newPage();
    expect(page.withLoader).toBeDefined();

    const filePath = path.resolve('./test/html/withLoader.html');
    await page.goto(`file://${filePath}`);

    await page.withLoader(
      () => page.click('#load-btn'),
      '#loader'
    );

    expect(await page.locator('#result').isVisible()).toBe(true);
    expect(await page.locator('#loader').isVisible()).toBe(false);
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
  if (!x.describe || !x.tests) return;

  describe(x.describe, () => {
    for (const test of x.tests) {
      if (typeof test === 'function') {
        it('on browser context', { timeout: 20_000 }, async () => {
          const plugin = new TestPlugin();
          const performTest = test(plugin);
          const browser = await CamoufoxPro!.launch({ humanize: false });
          try {
            await performTest(browser);
          } finally {
            await browser.close();
          }
        });
      } else {
        runRecursiveTests(test);
      }
    }
  });
};

runRecursiveTests(pluginTests);

interface PluginTests {
  describe: string;
  tests: PluginTests[] | ((plugin: TestPlugin) => (browser: BrowserContext) => Promise<void>)[];
}
