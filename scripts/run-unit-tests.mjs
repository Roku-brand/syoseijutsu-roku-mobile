import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const tests = readdirSync('tests/unit').filter(name => name.endsWith('.test.mjs')).sort().map(name => 'tests/unit/' + name);
if (!tests.length) throw new Error('No unit tests were discovered.');
const result = spawnSync(process.execPath, ['--test', ...tests], { stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
