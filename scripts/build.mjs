#!/usr/bin/env node
/**
 * claude-uluo 打包脚本（Node 版，零依赖）
 * ============================================================
 * 用法:
 *   node scripts/build.mjs            # 全量打包
 *   node scripts/build.mjs <name>     # 打包指定扩展（如 video-production）
 *
 * 产物布局:
 *   skill 包  dist/<name>.zip  → SKILL.md 位于 zip 顶层，不含 .claude-plugin/
 *                              （符合 skill 上传规范：skill 包内禁止 plugin manifest）
 *   plugin 包 dist/<name>.zip  → plugins/<name>/ 前缀，保留 .claude-plugin/plugin.json
 *                              （仅 plugins/ 下的 memex、claude-uluo-all）
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(REPO, 'dist');

/* ---------------- 排除规则（对齐 .gitignore + skill dev 文件） ---------------- */
const EXCLUDE_DIRS = new Set([
  '.DS_Store', '__pycache__', '.pytest_cache', '__tests__', 'node_modules',
]);
const EXCLUDE_FILES = new Set([
  '.DS_Store', 'package.json', 'package-lock.json', 'vitest.config.js',
]);
const EXCLUDE_EXT = new Set([
  '.pyc', '.pyo', '.db', '.bak', '.html',
]);

function isExcluded(parts) {
  if (parts.some((p) => EXCLUDE_DIRS.has(p))) return true;
  const file = parts.at(-1);
  if (EXCLUDE_FILES.has(file)) return true;
  const ext = path.extname(file);
  return EXCLUDE_EXT.has(ext) || file.endsWith('.db.bak');
}

/* ---------------- 极简 ZIP 写入器（store/deflate，零依赖） ---------------- */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function dosDateTime(d) {
  const time = ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >>> 1)) & 0xffff;
  const date = (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xffff;
  return { time, date };
}

class ZipWriter {
  constructor() {
    this.chunks = [];
    this.entries = [];
    this.offset = 0;
  }

  add(name, raw, { dir = false } = {}) {
    const nameBuf = Buffer.from(dir ? `${name}/` : name, 'utf8');
    const { time, date } = dosDateTime(new Date());
    const crc = dir ? 0 : crc32(raw);
    let method = 0;
    let comp = raw;
    if (!dir && raw.length > 0) {
      const deflated = zlib.deflateRawSync(raw, { level: 9 });
      if (deflated.length < raw.length) {
        method = 8;
        comp = deflated;
      }
    }
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); // local file header sig
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0x0800, 6); // UTF-8 filename
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(comp.length, 18);
    local.writeUInt32LE(dir ? 0 : raw.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28); // extra len

    this.entries.push({ nameBuf, crc, method, time, date, csize: comp.length, usize: dir ? 0 : raw.length, offset: this.offset, dir });
    this.chunks.push(local, nameBuf, comp);
    this.offset += 30 + nameBuf.length + comp.length;
  }

  addFile(name, absPath) { this.add(name, fs.readFileSync(absPath)); }
  addDir(name) { this.add(name, Buffer.alloc(0), { dir: true }); }

  buffer() {
    const central = [];
    let cdSize = 0;
    for (const e of this.entries) {
      const c = Buffer.alloc(46);
      c.writeUInt32LE(0x02014b50, 0); // central dir header sig
      c.writeUInt16LE(0x031e, 4); // version made by: unix · zip 3.0
      c.writeUInt16LE(20, 6); // version needed
      c.writeUInt16LE(0x0800, 8); // UTF-8
      c.writeUInt16LE(e.method, 10);
      c.writeUInt16LE(e.time, 12);
      c.writeUInt16LE(e.date, 14);
      c.writeUInt32LE(e.crc, 16);
      c.writeUInt32LE(e.csize, 20);
      c.writeUInt32LE(e.usize, 24);
      c.writeUInt16LE(e.nameBuf.length, 28);
      c.writeUInt16LE(0, 30); // extra len
      c.writeUInt16LE(0, 32); // comment len
      c.writeUInt16LE(0, 34); // disk start
      c.writeUInt16LE(0, 36); // internal attrs
      // external attrs: unix mode (0755 dir / 0644 file) + DOS dir bit
      c.writeUInt32LE(e.dir ? 0x41ed0010 : 0x81a40000, 38);
      c.writeUInt32LE(e.offset, 42);
      central.push(c, e.nameBuf);
      cdSize += 46 + e.nameBuf.length;
    }
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0); // EOCD sig
    eocd.writeUInt16LE(this.entries.length, 8);
    eocd.writeUInt16LE(this.entries.length, 10);
    eocd.writeUInt32LE(cdSize, 12);
    eocd.writeUInt32LE(this.offset, 16); // central dir offset
    return Buffer.concat([...this.chunks, ...central, eocd]);
  }
}

/* ---------------- 目录遍历 ---------------- */
function* walk(dir, parts = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
  for (const ent of entries) {
    const rel = [...parts, ent.name];
    if (isExcluded(rel)) continue;
    if (ent.isDirectory()) {
      yield { kind: 'dir', rel };
      yield* walk(path.join(dir, ent.name), rel);
    } else if (ent.isFile()) {
      yield { kind: 'file', abs: path.join(dir, ent.name), rel };
    }
  }
}

/* ---------------- 打包 ---------------- */
function fmt(bytes) {
  return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)}K` : `${(bytes / 1024 / 1024).toFixed(1)}M`;
}

function buildSkill(name) {
  const src = path.join(REPO, 'skills', name);
  if (!fs.existsSync(src)) {
    console.error(`✗ ${name}: skills/${name} 不存在`);
    process.exitCode = 1;
    return;
  }
  const zip = new ZipWriter();
  let hasSkillMd = false;
  for (const item of walk(src)) {
    const relName = item.rel.join('/');
    // 关键：skill 包内禁止 plugin manifest
    if (item.rel[0] === '.claude-plugin') continue;
    if (item.kind === 'dir') {
      zip.addDir(relName);
    } else {
      if (item.rel.length === 1 && item.rel[0] === 'SKILL.md') hasSkillMd = true;
      zip.addFile(relName, item.abs);
    }
  }
  if (!hasSkillMd) {
    console.error(`✗ ${name}: SKILL.md 不在 skill 根目录，跳过`);
    process.exitCode = 1;
    return;
  }
  const out = path.join(DIST, `${name}.zip`);
  fs.writeFileSync(out, zip.buffer());
  console.log(`✓ dist/${name}.zip (${fmt(fs.statSync(out).size)}) — skill 格式（顶层 SKILL.md，无 manifest）`);
}

function buildPlugin(name) {
  const src = path.join(REPO, 'plugins', name);
  if (!fs.existsSync(src)) {
    console.error(`✗ ${name}: plugins/${name} 不存在`);
    process.exitCode = 1;
    return;
  }
  const prefix = `plugins/${name}`;
  const zip = new ZipWriter();
  for (const item of walk(src)) {
    const relName = `${prefix}/${item.rel.join('/')}`;
    if (item.kind === 'dir') zip.addDir(relName);
    else zip.addFile(relName, item.abs);
  }
  const out = path.join(DIST, `${name}.zip`);
  fs.writeFileSync(out, zip.buffer());
  console.log(`✓ dist/${name}.zip (${fmt(fs.statSync(out).size)}) — plugin 格式（${prefix}/）`);
}

function listNames() {
  const names = [];
  for (const base of ['skills', 'plugins']) {
    const dir = path.join(REPO, base);
    if (!fs.existsSync(dir)) continue;
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      if (ent.isDirectory() && !ent.name.startsWith('.')) names.push(ent.name);
    }
  }
  return names;
}

/* ---------------- main ---------------- */
fs.mkdirSync(DIST, { recursive: true });
const [target] = process.argv.slice(2);

if (!target) {
  console.log('=== 全量打包 ===');
  for (const name of listNames()) {
    if (fs.existsSync(path.join(REPO, 'skills', name))) buildSkill(name);
    else buildPlugin(name);
  }
  console.log(`=== 完成，共 ${fs.readdirSync(DIST).filter((f) => f.endsWith('.zip')).length} 个 zip ===`);
} else if (target === '-h' || target === '--help') {
  console.log('用法: node scripts/build.mjs [name]    # 无参数 = 全量打包');
  console.log(`可选: ${listNames().join(' ')}`);
} else if (fs.existsSync(path.join(REPO, 'skills', target))) {
  buildSkill(target);
} else if (fs.existsSync(path.join(REPO, 'plugins', target))) {
  buildPlugin(target);
} else {
  console.error(`✗ 未知扩展: ${target}\n可选: ${listNames().join(' ')}`);
  process.exit(1);
}
