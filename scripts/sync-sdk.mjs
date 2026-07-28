#!/usr/bin/env node
/**
 * SDK'yi public/sdk/sdk.mjs olarak kopyalar. src/lib/sdk/sdk.mjs ->
 * public/sdk/sdk.mjs. Esbuild kullanmadan (JS zaten saf JS).
 */

import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, '..');

const SRC = path.join(projectRoot, 'src', 'lib', 'sdk', 'sdk.mjs');
const DEST_DIR = path.join(projectRoot, 'public', 'sdk');
const DEST = path.join(DEST_DIR, 'sdk.mjs');

await mkdir(DEST_DIR, { recursive: true });
await copyFile(SRC, DEST);
console.log('  + public/sdk/sdk.mjs');
