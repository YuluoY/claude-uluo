// 由 vp.py trace 调用：tsx src/genres/algorithm/run-trace.ts <id> <输出文件>
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { TraceDefinition } from './tracer';

const main = async (): Promise<void> => {
  const [id, out] = process.argv.slice(2);
  if (!id || !out) {
    throw new Error('用法：tsx src/genres/algorithm/run-trace.ts <id> <输出文件>');
  }
  const file = resolve('src', 'algo', id, 'trace.ts');
  const mod = (await import(pathToFileURL(file).href)) as { default?: TraceDefinition | { default?: TraceDefinition } };
  let def = mod.default as TraceDefinition | { default?: TraceDefinition } | undefined;
  if (def && !('run' in def) && def.default) {
    def = def.default;
  }
  if (!def || typeof (def as TraceDefinition).run !== 'function') {
    throw new Error(`${file} 必须 export default defineTrace((t) => { … })`);
  }
  const steps = (def as TraceDefinition).run();
  writeFileSync(out, JSON.stringify({ steps }));
};

main().catch((err: unknown) => {
  console.error(err instanceof Error ? (err.stack ?? err.message) : String(err));
  process.exit(1);
});
