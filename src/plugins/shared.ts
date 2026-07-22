import type * as Playwright from 'playwright-core';

import type { Page } from '..';

export type WaitForSelectorOptions = Parameters<Playwright.Page['waitForSelector']>[1];

export function newPage(oldPage: Playwright.Page): Page {
  const page = oldPage as Page;

  page.withLoader = async<T>(fn: () => Promise<T>, loadingSelector: string, visibleWaitOptions?: WaitForSelectorOptions, hiddenWaitOptions?: WaitForSelectorOptions): Promise<T> => {
    const loadingVisible = page.waitForSelector(loadingSelector, visibleWaitOptions || { state: 'visible' });
    const retPromise = Promise.resolve().then(fn);

    try {
      const [, ret] = await Promise.all([loadingVisible, retPromise]);
      await page.waitForSelector(loadingSelector, hiddenWaitOptions || { state: 'hidden' });
      return ret;
    } catch (err) {
      await retPromise.catch(() => undefined);
      throw err;
    }
  };

  return page;
}
