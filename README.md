# Camoufox-Pro

A simple [`camoufox-js`](https://github.com/apify/camoufox-js) wrapper to enable useful plugins with ease

## Installation

Requires Node.js 22 and higher

```bash
npm install camoufox-pro
camoufox-js fetch
```

## Quickstart

Camoufox-Pro can do all the same things as [`camoufox-js`](https://github.com/apify/camoufox-js), just now with plugins!

```js
// Camoufox-Pro is a drop-in replacement for camoufox
const CamoufoxPro = require('camoufox-pro');

(async () => {
  const browser = await CamoufoxPro.launch();

  // Enable the 'solveRecaptchas' plugin to solve Google's recaptchas (remember to provide a wit.api API access token)
  const solver = await browser.solveRecaptchas('WIT_AI_ACCESS_TOKEN');

  const page = await browser.newPage();
  
  console.log('Testing the recaptcha solver..')
  await page.goto('https://recaptcha-demo.appspot.com/recaptcha-v2-checkbox.php');
  await solver.waitForCaptcha(page); // Captcha script is deferred, so will load after page.goto completes
  await solver.solveRecaptcha(page);
  await page.screenshot({ path: 'is-recaptcha-solved.png' });

  await browser.close();
})();
```

## Passive Improvements

- `page.withLoader` function that wraps any function with waiting for a selector to appear and then disappear.

## Optional Built-in Plugins

### Manage Cookies

- Save and load cookies across sessions
- Supports multiple profiles and switching between profiles

### Manage Local Storage

- Save and load local storage across sessions
- Supports multiple profiles and switching between profiles

### Solve Recaptcha

- Solve Google's reCAPTCHA v2
- Requires a FREE [wit.ai](https://wit.ai/apps) access token
