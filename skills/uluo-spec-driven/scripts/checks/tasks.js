// tasks/ phase*.md 专有校验
const fs = require('fs');
const path = require('path');
const { checkAuthor } = require('../_shared/utils');

function check(filePath) {
  const findings = [];
  const fname = path.basename(filePath);
  let content;
  try { content = fs.readFileSync(filePath, 'utf-8'); }
  catch { findings.push({ type: 'fail', msg: `${fname}: 无法读取文件` }); return findings; }

  // ── 0. 元数据 author 校验 ──────────────────────────────────
  const authorErr = checkAuthor(content, fname);
  if (authorErr) findings.push({ type: 'fail', msg: authorErr });
  else findings.push({ type: 'pass', msg: `${fname}: 作者字段有效` });

  // ── 1. 任务粒度：每个任务必须标注预估工时 ─────────────────
  const taskBlocks = content.match(/-\s*\[.\]\s*\*\*T[\d.]+\*\*[:\s]*[^\n]*/g) || [];
  if (taskBlocks.length === 0) {
    findings.push({ type: 'fail', msg: `${fname}: 未找到任务条目——格式应为 "- [ ] **T1.1**: 任务标题"` });
    return findings;
  }

  let tasksWithEstimate = 0;
  let tasksWithOutput = 0;
  let tasksWithReference = 0;
  let tasksWithReuse = 0;
  let tasksWithAcceptance = 0;

  // Extract the full content between each task header
  const blocks = content.split(/-\s*\[\s*.\s*\]\s*\*\*T[\d.]+\*\*/g).slice(1);

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    // Find next task or section boundary
    const taskContent = block.split(/-\s*\[.\]\s*\*\*T[\d.]+\*\*|^##\s/gm)[0];

    if (/\*\*预估\*\*/.test(taskContent)) tasksWithEstimate++;
    if (/\*\*产出物\*\*/.test(taskContent)) tasksWithOutput++;
    if (/\*\*参考\*\*/.test(taskContent)) tasksWithReference++;
    if (/\*\*复用\*\*/.test(taskContent)) tasksWithReuse++;
    if (/\*\*验收\*\*/.test(taskContent)) tasksWithAcceptance++;
  }

  const total = taskBlocks.length;

  // Check each required field
  if (tasksWithOutput < total) {
    findings.push({ type: 'fail', msg: `${fname}: ${total - tasksWithOutput}/${total} 个任务缺少"产出物"字段（必须写完整包路径）` });
  }
  if (tasksWithReference < total) {
    findings.push({ type: 'fail', msg: `${fname}: ${total - tasksWithReference}/${total} 个任务缺少"参考"字段（必须标注参考的已有代码）` });
  }
  if (tasksWithReuse < total) {
    findings.push({ type: 'warn', msg: `${fname}: ${total - tasksWithReuse}/${total} 个任务缺少"复用"字段（建议标注可复用的已有模块）` });
  }
  if (tasksWithAcceptance < total) {
    findings.push({ type: 'warn', msg: `${fname}: ${total - tasksWithAcceptance}/${total} 个任务缺少"验收"字段` });
  }
  if (tasksWithEstimate < total) {
    findings.push({ type: 'warn', msg: `${fname}: ${total - tasksWithEstimate}/${total} 个任务缺少"预估"字段` });
  }

  if (tasksWithOutput === total && tasksWithReference === total) {
    findings.push({ type: 'pass', msg: `${fname}: ${total} 个任务均含产出物路径 + 参考代码` });
  }

  // ── 2. 产出物必须包含完整路径（至少有一个 /） ────────────
  const outputs = content.match(/\*\*产出物\*\*[:\s]*`?([^`\n]+)`?/g) || [];
  let properPath = 0;
  for (const o of outputs) {
    const val = o.replace(/\*\*产出物\*\*[:\s]*`?/, '').replace(/`$/, '').trim();
    if (val.includes('/') || val.includes('\\')) {
      properPath++;
    } else if (val.includes('新') || val.includes('新增')) {
      findings.push({ type: 'warn', msg: `${fname}: 产出物路径不够具体: "${val}"——应写完整包路径如 "coupon/domain/CouponValidator.java"` });
    }
  }
  if (properPath > 0) {
    findings.push({ type: 'pass', msg: `${fname}: ${properPath} 个产出物标注了完整路径` });
  }

  // ── 3. 任务工时检查（0.5h ~ 4h） ────────────────────────
  const estimates = content.match(/\*\*预估\*\*[:\s]*(\d+\.?\d*)h?/g) || [];
  let outOfRange = 0;
  for (const e of estimates) {
    const m = e.match(/(\d+\.?\d*)/);
    if (m) {
      const hours = parseFloat(m[1]);
      if (hours < 0.5) {
        findings.push({ type: 'warn', msg: `${fname}: 任务工时 ${hours}h 过低（<0.5h 太碎）` });
        outOfRange++;
      } else if (hours > 4) {
        findings.push({ type: 'warn', msg: `${fname}: 任务工时 ${hours}h 过高（>4h 应拆分）` });
        outOfRange++;
      }
    }
  }
  if (outOfRange === 0 && estimates.length > 0) {
    findings.push({ type: 'pass', msg: `${fname}: 所有任务工时在 0.5h-4h 范围内` });
  }

  // ── 4. 依赖关系：检查跨文件一致性 ────────────────────────
  // 注意：自依赖检测需要在有完整 task 上下文时进行，此处仅做基础检查
  const deps = content.match(/\*\*依赖\*\*[:\s]*([^\n]+)/g) || [];
  if (deps.length > 0) {
    // Check for N/A vs actual deps
    const hasRealDeps = deps.some(d => !/N\/A|无/.test(d));
    if (hasRealDeps) {
      findings.push({ type: 'pass', msg: `${fname}: 依赖关系已标注` });
    }
  }

  return findings;
}

module.exports = { check };
