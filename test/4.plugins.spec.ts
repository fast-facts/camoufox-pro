// eslint-disable-next-line @typescript-eslint/no-require-imports
require('dotenv-safe').config();

import * as CamoufoxPro from '../src';
import type { BrowserContext } from '../src';
import { manageCookiesTest } from '../src/plugins/manage.cookies/test.spec';
import { manageLocalStorageTest } from '../src/plugins/manage.localstorage/test.spec';
// import { solveRecaptchasTest } from '../src/plugins/solve.recaptchas/test.spec';

interface PluginTests {
  describe: string;
  tests: PluginTests[] | ((browser: BrowserContext) => Promise<void>)[];
}

const runRecursiveTests = (x: PluginTests) => {
  if (!x.describe || !x.tests) return;

  describe(x.describe, () => {
    for (const test of x.tests) {
      if (typeof test === 'function') {
        it('on browser context', { timeout: 30_000 }, async () => {
          const context = await CamoufoxPro!.launch();
          try {
            await test(context);
          } finally {
            await context.close();
          }
        });
      } else {
        runRecursiveTests(test);
      }
    }
  });
};

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
    }, {
      describe: 'clear without pages',
      tests: [manageCookiesTest.clearWithoutPages()],
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
    }, {
      describe: 'clear without pages',
      tests: [manageLocalStorageTest.clearWithoutPages()],
    }, {
      describe: 'preserves other origins on save',
      tests: [manageLocalStorageTest.preservesOtherOrigins()],
    }],
    // },
    // {
    //   describe: 'can solve recaptcha',
    //   tests: [solveRecaptchasTest],
  }],
};

runRecursiveTests(pluginTests);
