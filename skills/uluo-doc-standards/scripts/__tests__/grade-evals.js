const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const WORKSPACE = process.argv[2] || '/Users/huyongle/Desktop/workspace/skills/uluo-doc-standards-workspace/iteration-2';
const VALIDATOR = path.join(__dirname, '..', 'validate-docs.js');

function findFiles(dir, ext) {
  const results = [];
  function walk(d) {
    if (!fs.existsSync(d)) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.name.endsWith(ext)) results.push(full);
    }
  }
  walk(dir);
  return results;
}

function grade(config, outputDir) {
  let results = [];
  function check(id, text, fn) {
    try { const p = fn(); results.push({ id, text, passed: p, evidence: p ? 'pass' : 'fail' }); }
    catch(e) { results.push({ id, text, passed: false, evidence: e.message }); }
  }

  check('doc-structure', '规范化目录结构', () => {
    const specsDir = path.join(outputDir, 'specs');
    if (!fs.existsSync(specsDir)) return false;
    const features = fs.readdirSync(specsDir);
    if (features.length === 0) return false;
    const fd = path.join(specsDir, features[0]);
    if (config.scenario === 'bug-fix') return fs.existsSync(path.join(fd, 'spec.md')) && fs.existsSync(path.join(fd, 'tasks.md'));
    if (config.scenario === 'tech-review') return fs.existsSync(path.join(fd, 'spec.md')) && fs.existsSync(path.join(fd, 'plans', 'README.md'));
    return fs.existsSync(path.join(fd, 'spec.md')) && fs.existsSync(path.join(fd, 'plans', 'README.md'));
  });

  const allMd = findFiles(outputDir, '.md');
  const specFiles = allMd.filter(f => f.endsWith('spec.md'));
  const planFiles = allMd.filter(f => f.endsWith('README.md'));
  const taskFiles = allMd.filter(f => f.includes('phase') || f.endsWith('tasks.md'));
  const changelogFiles = allMd.filter(f => f.endsWith('CHANGELOG.md'));

  if (specFiles.length > 0) {
    const c = fs.readFileSync(specFiles[0], 'utf-8');
    check('spec-sections', '含背景/用户故事/FR/验收标准', () => /背景|用户故事/.test(c) && /功能需求/.test(c) && /验收标准/.test(c));
    check('spec-users', '多角色用户故事', () => (c.match(/作为.+?，/g) || []).length >= 2);
    check('spec-ac', '验收标准可验证', () => !/用户体验好/.test(c));
  }
  if (planFiles.length > 0 && config.scenario !== 'bug-fix') {
    const c = fs.readFileSync(planFiles[0], 'utf-8');
    check('plan-decisions', '设计决策四段完整', () => /\*\*选择\*\*/.test(c) && /\*\*原因\*\*/.test(c) && /\*\*替代方案\*\*/.test(c) && /\*\*影响\*\*/.test(c));
    check('plan-api', 'API契约含错误码', () => /错误码|N\/A/.test(c));
  }
  if (taskFiles.length > 0) {
    const c = fs.readFileSync(taskFiles[0], 'utf-8');
    check('tasks-fields', '任务含产出物+参考', () => /\*\*产出物\*\*/.test(c) && /\*\*参考\*\*/.test(c));
  }
  if (changelogFiles.length > 0) {
    const c = fs.readFileSync(changelogFiles[0], 'utf-8');
    check('changelog', 'CHANGELOG标准分类', () => /^### (Added|Changed|Fixed|Security)/m.test(c));
  }

  const specsDir = path.join(outputDir, 'specs');
  if (fs.existsSync(specsDir)) {
    const feats = fs.readdirSync(specsDir);
    if (feats.length > 0) {
      try {
        const result = execSync(`node "${VALIDATOR}" "${path.join(specsDir, feats[0])}"`, { encoding: 'utf-8', timeout: 15000 });
        const fails = (result.match(/✗/g) || []).length;
        check('validate-pass', 'validate-docs.js零失败', () => fails === 0);
      } catch(e) { check('validate-pass', 'validate-docs.js零失败', () => false); }
    }
  }

  return results;
}

const evals = [
  { name: 'eval-1-coupon-module', scenario: 'medium-feature' },
  { name: 'eval-2-race-condition', scenario: 'bug-fix' },
  { name: 'eval-3-payment-gateway', scenario: 'tech-review' },
];

for (const e of evals) {
  for (const variant of ['with_skill', 'without_skill']) {
    const outputDir = path.join(WORKSPACE, e.name, variant, 'outputs');
    const results = grade(e, outputDir);
    const summary = { passed: results.filter(r=>r.passed).length, failed: results.filter(r=>!r.passed).length, total: results.length, pass_rate: results.length > 0 ? results.filter(r=>r.passed).length / results.length : 0 };
    fs.writeFileSync(path.join(WORKSPACE, e.name, variant, 'grading.json'), JSON.stringify({ expectations: results, summary }, null, 2));
    console.log(`${e.name} ${variant}: ${summary.passed}/${summary.total} (${(summary.pass_rate*100).toFixed(0)}%)`);
  }
}
console.log('Done.');
