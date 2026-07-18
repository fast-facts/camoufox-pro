import * as CamoufoxPro from '../src';

suite('Original methods', () => {
  it('should launch and navigate', async () => {
    const browser = await CamoufoxPro.launch();
    expect(browser).toBeDefined();
    expect(browser.newPage).toBeDefined();

    const page = await browser.newPage();
    expect(page).toBeDefined();
    expect(page.goto).toBeDefined();

    await page.goto('about:blank');
    expect(page.url()).toBe('about:blank');

    await browser.close();
  });
});
