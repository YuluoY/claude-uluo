'use strict';

const LEVEL_TITLE = {
  1: '一级：可信度杀手，立即处理',
  2: '二级：明显 AI 味，发布前处理',
  3: '三级：风格打磨，有空再处理',
};

function formatFinding(f) {
  const lines = [];
  const tag = f.protected ? '（受保护：只标记不改）' : '';
  lines.push(`第 ${f.line} 行 [${f.rule}] ${f.label}：「${f.match}」${tag}`);
  const extra = [f.suggestion, f.message, f.note ? `放行语境：${f.note}` : null].filter(Boolean).join('；');
  lines.push(`  → ${extra}`);
  if (f.occurrences) lines.push(`  出现行：${f.occurrences.join('、')}`);
  if (f.context && f.context !== f.match) lines.push(`  原句：${f.context}`);
  return lines.join('\n');
}

function formatScan(report) {
  const out = [];
  const { scene, stats, summary } = report;
  if (report.file) out.push(`扫描：${report.file}`);
  const sceneSource = scene.source === 'arg' ? '用户指定' : `自动判断：${scene.reason}`;
  out.push(`场景：${scene.label}（${sceneSource}）${report.options.officialese ? '，去机关腔' : ''}`);
  out.push(
    `统计：中文 ${stats.cjk} 字，${stats.paragraphs} 段，${stats.sentences} 句；段长变异系数 ${stats.paragraphCV}，句长变异系数 ${stats.sentenceCV}`
  );
  out.push(`结果：一级 ${summary.level1} 处，二级 ${summary.level2} 处，三级 ${summary.level3} 处`);
  if (summary.omittedByLevel) out.push(`（按 --max-level ${report.options.maxLevel} 省略 ${summary.omittedByLevel} 处）`);
  out.push(`建议推倒重写：${summary.rebuildSuggested ? `是（${summary.rebuildReasons.join('，')}）` : '否'}`);

  for (const level of [1, 2, 3]) {
    const items = report.findings.filter((f) => f.level === level);
    if (!items.length) continue;
    out.push('', `── ${LEVEL_TITLE[level]} ──`);
    for (const f of items) out.push(formatFinding(f));
  }

  const suppressed = Object.entries(report.suppressed);
  if (suppressed.length) {
    out.push('', `── 场景压下（${scene.label}） ──`);
    out.push(suppressed.map(([id, n]) => `${id} ×${n}`).join('，'));
  }
  if (!report.findings.length) out.push('', '没有命中。脚本抓不到的“通读”条目仍需人工看一遍。');
  return out.join('\n');
}

module.exports = { formatScan, formatFinding };
