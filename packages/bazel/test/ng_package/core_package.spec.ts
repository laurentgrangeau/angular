/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {runfiles} from '@bazel/runfiles';
import * as path from 'path';
import * as shx from 'shelljs';

// Resolve the "npm_package" directory by using the runfile resolution. Note that we need to
// resolve the "package.json" of the package since otherwise NodeJS would resolve the "main"
// file, which is not necessarily at the root of the "npm_package".
shx.cd(path.dirname(runfiles.resolve('angular/packages/core/npm_package/package.json')));

/**
 * Utility functions that allows me to create fs paths
 *   p`${foo}/some/${{bar}}/path` rather than path.join(foo, 'some',
 */
function p(templateStringArray: TemplateStringsArray) {
  const segments = [];
  for (const entry of templateStringArray) {
    segments.push(...entry.split('/').filter(s => s !== ''));
  }
  return path.join(...segments);
}

describe('@angular/core ng_package', () => {
  describe('misc root files', () => {
    describe('README.md', () => {
      it('should have a README.md file with basic info', () => {
        expect(shx.cat('README.md')).toContain(`Angular`);
        expect(shx.cat('README.md')).toContain(`https://github.com/angular/angular`);
      });
    });
  });

  describe('primary entry-point', () => {
    describe('package.json', () => {
      const packageJson = 'package.json';

      it('should have a package.json file', () => {
        expect(shx.grep('"name":', packageJson)).toContain(`@angular/core`);
      });

      it('should contain correct version number with the PLACEHOLDER string replaced', () => {
        expect(shx.grep('"version":', packageJson)).toMatch(/\d+\.\d+\.\d+(?!-PLACEHOLDER)/);
      });

      it('should contain module resolution mappings', () => {
        const data = JSON.parse(shx.cat(packageJson)) as any;
        expect(data).toEqual(jasmine.objectContaining({
          module: `./fesm2015/core.mjs`,
          es2020: `./fesm2020/core.mjs`,
          esm2020: `./esm2020/core.mjs`,
          fesm2020: `./fesm2020/core.mjs`,
          fesm2015: `./fesm2015/core.mjs`,
          typings: `./core.d.ts`,
          exports: {
            '.': {
              types: './core.d.ts',
              es2015: './fesm2015/core.mjs',
              node: './fesm2015/core.mjs',
              default: './fesm2020/core.mjs'
            },
            './package.json': {default: './package.json'},
            './testing': {
              types: './testing/testing.d.ts',
              es2015: './fesm2015/testing.mjs',
              node: './fesm2015/testing.mjs',
              default: './fesm2020/testing.mjs',
            },
            './schematics/*': {
              'default': './schematics/*.js',
            },
          }
        }));
      });

      it('should contain metadata for ng update', () => {
        interface PackageJson {
          'ng-update': {packageGroup: string[];};
        }

        expect(shx.cat(packageJson)).not.toContain('NG_UPDATE_PACKAGE_GROUP');
        expect((JSON.parse(shx.cat(packageJson)) as PackageJson)['ng-update'].packageGroup)
            .toContain('@angular/core');
      });
    });

    describe('typescript support', () => {
      it('should not have amd module names', () => {
        expect(shx.cat('core.d.ts')).not.toContain('<amd-module name');
      });
      it('should have an index d.ts file', () => {
        expect(shx.cat('core.d.ts')).toContain('export declare');
      });

      // The `r3_symbols` file was needed for View Engine ngcc processing.
      // This test ensures we no longer ship it by accident.
      it('should not have an r3_symbols d.ts file', () => {
        expect(shx.test('-e', 'src/r3_symbols.d.ts')).toBe(false);
      });
    });

    describe('fesm2020', () => {
      it('should have a fesm2020 file in the /fesm2020 directory', () => {
        expect(shx.cat('fesm2020/core.mjs')).toContain(`export {`);
      });

      it('should have a source map', () => {
        expect(shx.cat('fesm2020/core.mjs.map'))
            .toContain(`{"version":3,"file":"core.mjs","sources":`);
      });

      it('should have the version info in the header', () => {
        expect(shx.cat('fesm2020/core.mjs'))
            .toMatch(/@license Angular v\d+\.\d+\.\d+(?!-PLACEHOLDER)/);
      });
    });

    describe('fesm2015', () => {
      it('should have a fesm2015 file in the /fesm2015 directory', () => {
        expect(shx.cat('fesm2015/core.mjs')).toContain(`export {`);
      });

      it('should have a source map', () => {
        expect(shx.cat('fesm2015/core.mjs.map'))
            .toContain(`{"version":3,"file":"core.mjs","sources":`);
      });

      it('should have the version info in the header', () => {
        expect(shx.cat('fesm2015/core.mjs'))
            .toMatch(/@license Angular v\d+\.\d+\.\d+(?!-PLACEHOLDER)/);
      });
    });

    describe('esm2020', () => {
      it('should not contain any *.ngfactory.js files', () => {
        expect(shx.find('esm2020').filter(f => f.includes('.ngfactory'))).toEqual([]);
      });

      it('should not contain any *.ngsummary.js files', () => {
        expect(shx.find('esm2020').filter(f => f.includes('.ngsummary'))).toEqual([]);
      });
    });
  });

  describe('secondary entry-point', () => {
    describe('package.json', () => {
      const packageJson = p`testing/package.json`;

      it('should have a package.json file', () => {
        expect(shx.grep('"name":', packageJson)).toContain(`@angular/core/testing`);
      });

      it('should have its module resolution mappings defined in the nested package.json', () => {
        const packageJson = p`testing/package.json`;
        const data = JSON.parse(shx.cat(packageJson)) as any;

        expect(data).toEqual(jasmine.objectContaining({
          module: `../fesm2015/testing.mjs`,
          es2020: `../fesm2020/testing.mjs`,
          esm2020: `../esm2020/testing/testing.mjs`,
          fesm2020: `../fesm2020/testing.mjs`,
          fesm2015: `../fesm2015/testing.mjs`,
          typings: `./testing.d.ts`,
        }));
        expect(data.exports).toBeUndefined();
      });
    });

    describe('typings', () => {
      const typingsFile = p`testing/testing.d.ts`;
      it('should have a typings file', () => {
        expect(shx.cat(typingsFile)).toContain('export declare');
      });
    });

    describe('fesm2020', () => {
      it('should have a fesm2020 file in the /fesm2020 directory', () => {
        expect(shx.cat('fesm2020/testing.mjs')).toContain(`export {`);
      });

      it('should have a source map', () => {
        expect(shx.cat('fesm2020/testing.mjs.map'))
            .toContain(`{"version":3,"file":"testing.mjs","sources":`);
      });

      it('should have the version info in the header', () => {
        expect(shx.cat('fesm2020/testing.mjs'))
            .toMatch(/@license Angular v\d+\.\d+\.\d+(?!-PLACEHOLDER)/);
      });
    });

    describe('fesm2015', () => {
      it('should have a fesm105 file in the /fesm2015 directory', () => {
        expect(shx.cat('fesm2015/testing.mjs')).toContain(`export {`);
      });

      it('should have a source map', () => {
        expect(shx.cat('fesm2015/testing.mjs.map'))
            .toContain(`{"version":3,"file":"testing.mjs","sources":`);
      });

      it('should have the version info in the header', () => {
        expect(shx.cat('fesm2015/testing.mjs'))
            .toMatch(/@license Angular v\d+\.\d+\.\d+(?!-PLACEHOLDER)/);
      });
    });
  });
});
