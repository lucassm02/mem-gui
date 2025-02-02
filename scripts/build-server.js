/* eslint-disable no-undef */
import { build } from 'esbuild';
import path from 'path';

const inputFilePath = path.join('src/server/index.ts');
const outputFilePath = path.join('dist/server/index.cjs');

build({
  entryPoints: [inputFilePath],
  bundle: true,
  platform: 'node',
  target: 'node22',
  outfile: outputFilePath,
  external: [],
  sourcemap: true,
}).catch(() => process.exit(1));
