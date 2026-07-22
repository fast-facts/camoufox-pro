import type * as Playwright from 'playwright-core';

import { launch } from '../src';
import type { BrowserContext } from '../src';
import { Plugin } from '../src/plugins';

const sleep = (time: number) => new Promise(resolve => { setTimeout(resolve, time); });

class TestPlugin extends Plugin {
  _state = false;

  async afterLaunch(browser: Playwright.BrowserContext) {
    const _newPage = browser.newPage;
    browser.newPage = async () => {
      const page = await _newPage.apply(browser);
      await sleep(100);
      return page;
    };
  }

  async onPageCreated() { this.state = true; }

  get state() { return this._state; }
  set state(state) { this._state = state; }
}

interface PluginTests {
  describe: string;
  tests: PluginTests[] | ((plugin: TestPlugin) => (browser: BrowserContext) => Promise<void>)[];
}

function runRecursiveTests(x: PluginTests) {
  if (!x.describe || !x.tests) return;

  describe(x.describe, () => {
    for (const test of x.tests) {
      if (typeof test === 'function') {
        it('on browser context', { timeout: 20_000 }, async () => {
          const plugin = new TestPlugin();
          const performTest = test(plugin);
          const browser = await launch({ humanize: false }) as BrowserContext;
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
}

async function getResult(browser: BrowserContext, plugin: TestPlugin) {
  const page = await browser.newPage();
  const works = plugin.state;
  plugin.state = false;
  await page.close();
  return works;
}

const addTest = (plugin: TestPlugin) => async (browser: BrowserContext) => {
  await browser.clearPlugins();
  await browser.addPlugin(plugin);
  expect(await getResult(browser, plugin)).toBe(true);
};

const stopTest = (plugin: TestPlugin) => async (browser: BrowserContext) => {
  await browser.clearPlugins();
  await browser.addPlugin(plugin);
  expect(await getResult(browser, plugin)).toBe(true);

  await plugin.stop();
  expect(await getResult(browser, plugin)).toBe(false);
};

const restartTest = (plugin: TestPlugin) => async (browser: BrowserContext) => {
  await browser.clearPlugins();
  await browser.addPlugin(plugin);
  expect(await getResult(browser, plugin)).toBe(true);

  await plugin.stop();
  expect(await getResult(browser, plugin)).toBe(false);

  await plugin.restart();
  expect(await getResult(browser, plugin)).toBe(true);
};

const dependencyTest = (plugin: TestPlugin) => async (browser: BrowserContext) => {
  const dependency = new TestPlugin();
  await plugin.addDependency(dependency);

  await browser.clearPlugins();
  await browser.addPlugin(plugin);

  const checkBoth = async () => {
    const page = await browser.newPage();
    const works = plugin.state && dependency.state;
    plugin.state = false;
    dependency.state = false;
    await page.close();
    return works;
  };

  expect(await checkBoth()).toBe(true);

  await plugin.stop();
  expect(await checkBoth()).toBe(false);

  await plugin.restart();
  expect(await checkBoth()).toBe(true);
};

const clearPluginsMidlife = (_plugin: TestPlugin) => async (browser: BrowserContext) => {
  await browser.clearPlugins();

  let stopped = false;
  const p = new class extends Plugin {
    async afterStop() { stopped = true; }
  }();

  await browser.addPlugin(p);
  expect(p.isStopped).toBe(false);

  await browser.clearPlugins();
  expect(stopped).toBe(true);
  expect(browser.plugins.length).toBe(0);
};

const browserCloseCleanup = (_plugin: TestPlugin) => async (browser: BrowserContext) => {
  await browser.clearPlugins();

  let closed = false;
  const p = new class extends Plugin {
    async onClose() { closed = true; }
  }();

  await browser.addPlugin(p);
  expect(p.isInitialized).toBe(true);

  await browser.close();

  expect(closed).toBe(true);
  expect(p.isInitialized).toBe(false);
};

const initIdempotent = (_plugin: TestPlugin) => async (browser: BrowserContext) => {
  await browser.clearPlugins();

  let callCount = 0;
  const p = new class extends Plugin {
    async onPageCreated() { callCount++; }
  }();

  await browser.addPlugin(p);
  expect(p.isInitialized).toBe(true);

  const p1 = await browser.newPage();
  expect(callCount).toBe(1);
  await p1.close();

  await p.init(browser);
  expect(p.isInitialized).toBe(true);

  const p2 = await browser.newPage();
  expect(callCount).toBe(2);
  await p2.close();
};

const doubleStop = (_plugin: TestPlugin) => async (browser: BrowserContext) => {
  await browser.clearPlugins();

  let stopCount = 0;
  const p = new class extends Plugin {
    async afterStop() { stopCount++; }
  }();

  await browser.addPlugin(p);

  await p.stop();
  expect(stopCount).toBe(1);
  expect(p.isStopped).toBe(true);

  await p.stop();
  expect(stopCount).toBe(1);
  expect(p.isStopped).toBe(true);
};

const addPluginOnce = (_plugin: TestPlugin) => async (browser: BrowserContext) => {
  await browser.clearPlugins();

  const p = new class extends Plugin {}();
  await browser.addPlugin(p);
  await browser.addPlugin(p);
  expect(browser.plugins.length).toBe(1);
};

const pluginTests: PluginTests = {
  describe: 'CamoufoxPro',
  tests: [
    { describe: 'can add a plugin', tests: [addTest] },
    { describe: 'addPlugin ignores duplicate instance', tests: [addPluginOnce] },
    { describe: 'can stop a plugin', tests: [stopTest] },
    { describe: 'can restart a plugin', tests: [restartTest] },
    { describe: 'can have a plugin with dependencies', tests: [dependencyTest] },
    { describe: 'clearPlugins mid-lifecycle', tests: [clearPluginsMidlife] },
    { describe: 'browser close cleans up plugins', tests: [browserCloseCleanup] },
    { describe: 'init is idempotent', tests: [initIdempotent] },
    { describe: 'double stop is safe', tests: [doubleStop] },
  ],
};

runRecursiveTests(pluginTests);
