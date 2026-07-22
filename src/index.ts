import * as events from 'events';

import { Camoufox } from 'camoufox-js';
import type * as Playwright from 'playwright-core';

import type { Plugin } from './plugins';
import { newPage } from './plugins/shared';
import type { WaitForSelectorOptions } from './plugins/shared';

export async function launch(options?: Parameters<typeof Camoufox>[0]) {
  options ||= {};

  if (!('humanize' in options)) {
    options.humanize = true;
  }

  if (!('headless' in options)) {
    options.headless = true;
  }

  const browser = await Camoufox(options || {}) as Playwright.Browser | Playwright.BrowserContext;

  if ('newContext' in browser) {
    const context = await browser.newContext();
    return newContext(context);
  }

  return newContext(browser);
}

async function newContext(playwrightBrowserContext: Playwright.BrowserContext): Promise<BrowserContext> {
  const context = playwrightBrowserContext as BrowserContext;

  context.close = async () => {
    await context.browser()?.close();
    context.browserEvents.emit('close');
  };

  const _newPage = context.newPage;
  context.newPage = async () => {
    const page: Playwright.Page = await _newPage.apply(context);

    return newPage(page);
  };

  addPluginSupport(context);

  return context;
}

function addPluginSupport(browser: BrowserContext) {
  browser.plugins = [];
  browser.browserEvents = new events.EventEmitter();
  browser.interceptions = 0;

  browser.addPlugin = async (plugin: Plugin) => {
    if (browser.plugins.includes(plugin)) return;
    browser.plugins.push(plugin);
    await plugin.init(browser);
  };

  browser.clearPlugins = async () => {
    await Promise.all(browser.plugins.map(p => p.stop()));
    browser.plugins = [];
  };

  browser.manageCookies = async (opts: ManageCookiesOption): Promise<ManageCookiesPlugin> => {
    const plugin = new ManageCookiesPlugin(opts);
    await browser.addPlugin(plugin);
    return plugin;
  };

  browser.manageLocalStorage = async (opts: ManageLocalStorageOption): Promise<ManageLocalStoragePlugin> => {
    const plugin = new ManageLocalStoragePlugin(opts);
    await browser.addPlugin(plugin);
    return plugin;
  };

  browser.solveRecaptchas = async (accessToken: string): Promise<SolveRecaptchasPlugin> => {
    const plugin = new SolveRecaptchasPlugin(accessToken);
    await browser.addPlugin(plugin);
    return plugin;
  };
}

// Playwright
export interface Browser extends Playwright.Browser {
  newContext(options?: Playwright.BrowserContextOptions): Promise<BrowserContext>;
}

export interface BrowserContext extends Playwright.BrowserContext, Pluginable {
  newPage(): Promise<Page>;
}

export interface Page extends Playwright.Page {
  withLoader<T>(fn: () => Promise<T>, loadingSelector: string, visibleWaitOptions?: WaitForSelectorOptions, hiddenWaitOptions?: WaitForSelectorOptions): Promise<T>;
}
interface Pluginable {
  plugins: Plugin[];
  browserEvents: events.EventEmitter;
  interceptions: number;

  addPlugin: (plugin: Plugin) => Promise<void>;
  clearPlugins: () => Promise<void>;
  manageCookies: (opts: ManageCookiesOption) => Promise<ManageCookiesPlugin>;
  manageLocalStorage: (opts: ManageLocalStorageOption) => Promise<ManageLocalStoragePlugin>;
  solveRecaptchas: (accessToken: string) => Promise<SolveRecaptchasPlugin>;
}

import { ManageCookiesOption, ManageCookiesPlugin } from './plugins/manage.cookies';
import { ManageLocalStorageOption, ManageLocalStoragePlugin } from './plugins/manage.localstorage';
import { SolveRecaptchasPlugin } from './plugins/solve.recaptchas';
