// eslint-disable-next-line @typescript-eslint/no-require-imports
require('dotenv-safe').config();

import { vi } from 'vitest';

import * as CamoufoxPro from '../src';
import type { BrowserContext } from '../src';

import { manageCookiesTest } from '../src/plugins/manage.cookies/test.spec';
import { manageLocalStorageTest } from '../src/plugins/manage.localstorage/test.spec';
// import { solveRecaptchasTest } from '../src/plugins/solve.recaptchas/test.spec';

const pluginTests: PluginTests = {
  describe: 'CamoufoxPro\'s built-in plugins',
  tests: [{
    describe: 'can manage cookies',
    tests: [{
      describe: 'in manual mode',
      tests: [manageCookiesTest.modes('manual', { saveLocation: 'cookies.json', mode: 'manual', disableWarning: true })],
    }, {
      describe: 'in monitor mode',
      tests: [manageCookiesTest.modes('monitor', { saveLocation: 'cookies.json', mode: 'monitor', disableWarning: true })],
    }, {
      describe: 'using profiles',
      tests: [manageCookiesTest.profiles({ saveLocation: 'cookies.json', mode: 'manual', disableWarning: true })],
    }],
  },
  {
    describe: 'can manage localStorage',
    tests: [{
      describe: 'in manual mode',
      tests: [manageLocalStorageTest.modes('manual', { saveLocation: 'localStorage.json', mode: 'manual', disableWarning: true })],
    }, {
      describe: 'in monitor mode',
      tests: [manageLocalStorageTest.modes('monitor', { saveLocation: 'localStorage.json', mode: 'monitor', disableWarning: true })],
    }, {
      describe: 'using profiles',
      tests: [manageLocalStorageTest.profiles({ saveLocation: 'localStorage.json', mode: 'manual', disableWarning: true })],
    }],
    // },
    // {
    //   describe: 'can solve recaptcha',
    //   tests: [solveRecaptchasTest],
  }],
};

const runRecursiveTests = (x: PluginTests) => {
  if (x.describe && x.tests) {
    suite(x.describe, () => {
      for (const test of x.tests) {
        if (test instanceof Function) {
          vi.setConfig({ testTimeout: 30 * 1000 });

          let context: BrowserContext | undefined;

          afterEach(async () => {
            await context?.close();
            context = undefined;
          });

          it('on browser context', async () => {
            await test(() => CamoufoxPro!.launch());
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
  tests: PluginTests[] | ((createBrowser: () => Promise<BrowserContext>) => Promise<void>)[];
}
