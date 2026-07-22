import path from 'path';
import { launch } from '../src';
import type { BrowserContext } from '../src';

interface PluginTestsDirect {
  describe: string;
  tests: PluginTestsDirect[] | ((browser: BrowserContext) => Promise<void>)[];
}

function runRecursiveTestsDirect(x: PluginTestsDirect) {
  if (!x.describe || !x.tests) return;

  describe(x.describe, () => {
    for (const test of x.tests) {
      if (typeof test === 'function') {
        it('on browser context', { timeout: 20_000 }, async () => {
          const browser = await launch({ humanize: false }) as BrowserContext;
          try {
            await test(browser);
          } finally {
            await browser.close();
          }
        });
      } else {
        runRecursiveTestsDirect(test);
      }
    }
  });
}

const withLoaderTest = async (browser: BrowserContext) => {
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

  const start = Date.now();
  await expect(page.withLoader(
    async () => { throw new Error('boom'); },
    '#never-exists',
    { state: 'visible', timeout: 10_000 },
  )).rejects.toThrow('boom');
  expect(Date.now() - start).toBeLessThan(3_000);
};

const pageTests: PluginTestsDirect = {
  describe: 'CamoufoxPro\'s Page',
  tests: [{
    describe: 'can withLoader',
    tests: [withLoaderTest],
  }],
};

runRecursiveTestsDirect(pageTests);
