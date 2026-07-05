import * as CamoufoxPro from '../src';

suite('Original methods', () => {
  it(`should have launch`, async () => {
    const browser = await CamoufoxPro.launch();
    const page = await browser.newPage();
    await page.goto('https://www.google.com');
    await browser.close();
  });
});
