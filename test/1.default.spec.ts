import * as CamoufoxPro from '../src';

suite('Original methods', () => {
  ['launch'].map(x => {
    it(`should have ${x}`, () => {
      expect(CamoufoxPro).toHaveProperty(x);
    });
  });
});
