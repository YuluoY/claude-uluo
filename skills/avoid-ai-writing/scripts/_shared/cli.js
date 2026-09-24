'use strict';

const fs = require('fs');
const path = require('path');

const RED = '\x1b[0;31m';
const GREEN = '\x1b[0;32m';
const YELLOW = '\x1b[0;33m';
const CYAN = '\x1b[0;36m';
const MAGENTA = '\x1b[0;35m';
const BOLD = '\x1b[1m';
const NC = '\x1b[0m';

const COLORS = { RED, GREEN, YELLOW, CYAN, MAGENTA, BOLD, NC };

function parseArgs(supportedTypes) {
  const args = process.argv.slice(2);
  const result = {
    help: false,
    pretty: false,
    json: false,
    strict: false,
    type: null,
    scenario: null,
    level: null,
    target: '.',
    rest: []
  };

  let i = 0;
  let positionalCount = 0;

  while (i < args.length) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      result.help = true;
    } else if (arg === '--pretty') {
      result.pretty = true;
    } else if (arg === '--json') {
      result.json = true;
    } else if (arg === '--strict') {
      result.strict = true;
    } else if (arg === '--type') {
      i++;
      result.type = args[i] !== undefined ? args[i] : null;
    } else if (arg === '--scenario') {
      i++;
      result.scenario = args[i] !== undefined ? args[i] : null;
    } else if (arg === '--level') {
      i++;
      result.level = args[i] !== undefined ? args[i] : null;
    } else if (arg.startsWith('--')) {
      i++;
      continue;
    } else {
      if (positionalCount === 0) {
        result.target = arg;
      } else {
        result.rest.push(arg);
      }
      positionalCount++;
    }
    i++;
  }

  if (supportedTypes && result.type && !supportedTypes.includes(result.type)) {
    throw new Error(`不支持的查询类型: ${result.type}（可用: ${supportedTypes.join('/')}）`);
  }

  return result;
}

function fatal(msg) {
  console.error(`${RED}${BOLD}错误:${NC} ${msg}`);
  process.exit(1);
}

function outputJson(data, pretty) {
  if (pretty) {
    const util = require('util');
    console.log(util.inspect(data, { colors: true, depth: null, maxArrayLength: null }));
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

function ensureTargetDir(targetPath) {
  const resolved = path.resolve(targetPath);
  if (!fs.existsSync(resolved)) {
    fatal(`目录不存在: ${resolved}`);
  }
  if (!fs.statSync(resolved).isDirectory()) {
    fatal(`路径不是目录: ${resolved}`);
  }
  return resolved;
}

module.exports = { COLORS, parseArgs, fatal, outputJson, ensureTargetDir };
