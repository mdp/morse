// SPDX-FileCopyrightText: 2026 Mark Percival, John Schult
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Glob } from 'bun';

const year = new Date().getFullYear().toString();

async function collect(pattern: string): Promise<string[]> {
  const files: string[] = [];
  for await (const f of new Glob(pattern).scan('.')) files.push(f);
  return files;
}

async function annotate(args: string[], files: string[]): Promise<void> {
  if (!files.length) return;
  const proc = Bun.spawnSync(['reuse', 'annotate', ...args, ...files], {
    stdout: 'inherit',
    stderr: 'inherit',
  });
  if (proc.exitCode !== 0) process.exit(proc.exitCode ?? 1);
}

const srcFiles = (await collect('src/**/*.{ts,tsx}')).filter(
  (f) => !f.startsWith('src/components/ui/')
);
const scriptFiles = await collect('scripts/**/*.ts');
const rootFiles = await collect('*.ts');
const uiFiles = await collect('src/components/ui/*.tsx');

await annotate(
  [
    '--copyright',
    'Mark Percival, John Schult',
    '--license',
    'AGPL-3.0-or-later',
    '--year',
    year,
  ],
  [...srcFiles, ...scriptFiles, ...rootFiles]
);

await annotate(
  ['--copyright', 'shadcn', '--license', 'MIT', '--year', '2023'],
  uiFiles
);

console.log('reuse:fix done');
