#!/usr/bin/env node
'use strict';

const { scan } = require('./lib/scanner');
const { formatScan } = require('./lib/format');
const { readInput, RefusedError } = require('./lib/io');
const { SCENES } = require('./lib/scenes');

const HELP = `用法：node scripts/scan.js <文件|-> [选项]

扫描中文文本里的 AI 腔，按一二三级输出候选。“-”表示从标准输入读。

选项：
  --scene <id>      指定场景：${SCENES.map((s) => s.id).join(' / ')}（默认自动判断）
  --officialese     去机关腔：公文套话在所有场景按严处理
  --max-level <n>   只报到第 n 级（快速过稿用 2）
  --fail-on <n>     存在第 n 级及以上的命中时退出码为 1（复查闸门）
  --json            输出 JSON
  -h, --help        显示帮助

退出码：0 正常；1 触发 --fail-on；2 参数错误、文件不存在或文件类型被拒绝`;

function parseArgs(argv) {
  const args = { input: null, scene: null, officialese: false, maxLevel: 3, failOn: null, json: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-h' || a === '--help') args.help = true;
    else if (a === '--json') args.json = true;
    else if (a === '--officialese') args.officialese = true;
    else if (a === '--scene') args.scene = argv[++i];
    else if (a === '--max-level') args.maxLevel = Number(argv[++i]);
    else if (a === '--fail-on') args.failOn = Number(argv[++i]);
    else if (a === '-' || !a.startsWith('--')) args.input = a;
    else throw new Error(`未知参数：${a}`);
  }
  if (![1, 2, 3].includes(args.maxLevel)) throw new Error('--max-level 只能是 1、2、3');
  if (args.failOn !== null && ![1, 2, 3].includes(args.failOn)) throw new Error('--fail-on 只能是 1、2、3');
  return args;
}

function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (e) {
    console.error(`错误：${e.message}\n\n${HELP}`);
    process.exit(2);
  }
  if (args.help) {
    console.log(HELP);
    process.exit(0);
  }

  let report;
  try {
    const { text, file } = readInput(args.input);
    report = scan(text, { scene: args.scene, officialese: args.officialese, maxLevel: args.maxLevel, file });
  } catch (e) {
    const status = e instanceof RefusedError ? 'refused' : 'error';
    if (args.json) console.log(JSON.stringify({ status, message: e.message }, null, 2));
    else console.error(`${status === 'refused' ? '拒绝' : '错误'}：${e.message}`);
    process.exit(2);
  }

  console.log(args.json ? JSON.stringify(report, null, 2) : formatScan(report));
  if (args.failOn !== null && report.findings.some((f) => f.level <= args.failOn)) process.exit(1);
  process.exit(0);
}

main();
