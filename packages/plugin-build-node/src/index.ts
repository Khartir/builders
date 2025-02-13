import fs from 'fs';
import path from 'path';
import babelPluginDynamicImportSyntax from '@babel/plugin-syntax-dynamic-import';
import babelPluginImportMetaSyntax from '@babel/plugin-syntax-import-meta';
import babelPresetEnv from '@babel/preset-env';
import babelPluginDynamicImport from 'babel-plugin-dynamic-import-node-babel-7';
import builtinModules from 'builtin-modules';
import rollupBabel from 'rollup-plugin-babel';
import {BuilderOptions, MessageError} from '@pika/types';
import {rollup} from 'rollup';

const DEFAULT_MIN_NODE_VERSION = '8';

export function manifest(manifest) {
  manifest.main = manifest.main || 'dist-node/index.js';
}

export async function beforeJob({out}: BuilderOptions) {
  const srcDirectory = path.join(out, 'dist-src/');
  if (!fs.existsSync(srcDirectory)) {
    throw new MessageError('"dist-src/" does not exist, or was not yet created in the pipeline.');
  }
  const srcEntrypoint = path.join(out, 'dist-src/index.js');
  if (!fs.existsSync(srcEntrypoint)) {
    throw new MessageError('"dist-src/index.js" is the expected standard entrypoint, but it does not exist.');
  }
}

export async function build({out, reporter, options}: BuilderOptions): Promise<void> {
  const writeToNode = path.join(out, 'dist-node', 'index.js');

  // TODO: KEEP FIXING THIS,
  const result = await rollup({
    input: path.join(out, 'dist-src/index.js'),
    external: builtinModules as string[],
    plugins: [
      rollupBabel({
        babelrc: false,
        compact: false,
        presets: [
          [
            babelPresetEnv,
            {
              modules: false,
              targets: {node: options.minNodeVersion || DEFAULT_MIN_NODE_VERSION},
              spec: true,
            },
          ],
        ],
        plugins: [babelPluginDynamicImport, babelPluginDynamicImportSyntax, babelPluginImportMetaSyntax],
      }),
    ],
    onwarn: ((warning, defaultOnWarnHandler) => {
      // Unresolved external imports are expected
      if (
        warning.code === 'UNRESOLVED_IMPORT' &&
        !(warning.source.startsWith('./') || warning.source.startsWith('../'))
      ) {
        return;
      }
      defaultOnWarnHandler(warning);
    }) as any,
  });

  await result.write({
    file: writeToNode,
    format: 'cjs',
    exports: 'named',
    sourcemap: options.sourcemap === undefined ? true : options.sourcemap,
  });
  reporter.created(writeToNode, 'main');
}
