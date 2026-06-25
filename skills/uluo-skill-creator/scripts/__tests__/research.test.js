// research.js 通用渠道调研脚本测试——验证关键词匹配、本地 skill 扫描、JSON 输出
// 运行: node scripts/__tests__/research.test.js
//
// 说明: research.js 在模块顶层解析 argv 并调用 process.exit，
// 无法通过 require() 复用（会直接退出测试进程），故用 execSync 以子进程方式运行，
// 这也更贴近真实 CLI 调用方式。

const path = require('path');
const { execSync } = require('child_process');
const {
  suite,
  test,
  summary,
  createTempSkill,
  cleanFixtures,
  writeFixture,
} = require('./helpers');

// 调研脚本主入口（绝对路径）
const RESEARCH_SCRIPT = path.resolve(__dirname, '..', 'research.js');

/**
 * 运行 research.js 子进程
 * @param {string|null} keywords 关键词（null 表示无关键词参数）
 * @param {string[]} extraArgs 额外参数（如 ['--json', '--skills-dir', '/path']）
 * @returns {{ exitCode: number, stdout: string, json: object|null }}
 */
function runResearch(keywords, extraArgs = []) {
  // 无关键词时直接运行脚本（不传 keywords 参数）
  const args = keywords === null ? extraArgs : [keywords, ...extraArgs];
  const argsStr = args.map((a) => `"${a}"`).join(' ');
  const cmd = `node "${RESEARCH_SCRIPT}" ${argsStr}`;
  try {
    const stdout = execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
    const hasJson = extraArgs.includes('--json');
    return { exitCode: 0, stdout, json: hasJson ? JSON.parse(stdout) : null };
  } catch (e) {
    const stdout = e.stdout ? e.stdout.toString() : '';
    const hasJson = extraArgs.includes('--json');
    return {
      exitCode: typeof e.status === 'number' ? e.status : 1,
      stdout,
      json: hasJson && stdout ? safeParse(stdout) : null,
    };
  }
}

// 安全 JSON 解析（失败返回 null，避免掩盖真实错误）
function safeParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────
// 测试套件
// ─────────────────────────────────────────────────────────

suite('research.js 基础功能', () => {
  test('无参数时返回退出码 1 并显示用法', () => {
    const result = runResearch(null);
    if (result.exitCode !== 1) {
      throw new Error(`期望 exitCode=1，实际 ${result.exitCode}`);
    }
    if (!result.stdout.includes('用法')) {
      throw new Error('输出中应包含"用法"说明');
    }
  });

  test('有效关键词 + --json 返回 JSON 格式', () => {
    const tmpDir = createTempSkill('tmp-research-test');
    try {
      const result = runResearch('skill', ['--json', '--skills-dir', tmpDir]);
      if (result.exitCode !== 0) {
        throw new Error(`期望 exitCode=0，实际 ${result.exitCode}`);
      }
      if (!result.json) {
        throw new Error('应返回有效 JSON');
      }
      if (!Array.isArray(result.json.keywords)) {
        throw new Error('JSON 应包含 keywords 数组');
      }
      if (!Array.isArray(result.json.local_skills)) {
        throw new Error('JSON 应包含 local_skills 数组');
      }
      if (!result.json.summary || typeof result.json.summary.total !== 'number') {
        throw new Error('JSON 应包含 summary.total 数字');
      }
    } finally {
      cleanFixtures(path.dirname(tmpDir));
    }
  });

  test('文本模式输出包含标题', () => {
    const tmpDir = createTempSkill('tmp-research-text');
    try {
      const result = runResearch('test', ['--skills-dir', tmpDir]);
      if (result.exitCode !== 0) {
        throw new Error(`期望 exitCode=0，实际 ${result.exitCode}`);
      }
      if (!result.stdout.includes('Skill Research Report')) {
        throw new Error('文本模式应包含 "Skill Research Report" 标题');
      }
    } finally {
      cleanFixtures(path.dirname(tmpDir));
    }
  });
});

suite('research.js 关键词匹配', () => {
  test('匹配单个关键词返回 medium relevance', () => {
    const tmpParent = createTempSkill('tmp-match-single');
    const skillsDir = path.join(path.dirname(tmpParent), 'skills');
    // 创建一个含 "react" 关键词的 skill
    const skillDir = path.join(skillsDir, 'test-react-skill');
    writeFixture(
      path.join(skillDir, 'SKILL.md'),
      [
        '---',
        'name: test-react-skill',
        'version: 0.1.0',
        'description: >-',
        '  A skill for testing. Use this skill when working with React components.',
        '---',
        '',
        '# test-react-skill',
        '',
        'Test body.',
      ].join('\n')
    );

    try {
      const result = runResearch('react', ['--json', '--skills-dir', skillsDir]);
      if (result.exitCode !== 0) {
        throw new Error(`期望 exitCode=0，实际 ${result.exitCode}`);
      }
      const matched = result.json.local_skills.find((s) => s.name === 'test-react-skill');
      if (!matched) {
        throw new Error('应匹配到 test-react-skill');
      }
      if (matched.relevance !== 'medium') {
        throw new Error(`期望 relevance=medium，实际 ${matched.relevance}`);
      }
    } finally {
      cleanFixtures(path.dirname(tmpParent));
    }
  });

  test('匹配多个关键词返回 high relevance', () => {
    const tmpParent = createTempSkill('tmp-match-multi');
    const skillsDir = path.join(path.dirname(tmpParent), 'skills');
    const skillDir = path.join(skillsDir, 'test-react-component');
    writeFixture(
      path.join(skillDir, 'SKILL.md'),
      [
        '---',
        'name: test-react-component',
        'version: 0.1.0',
        'description: >-',
        '  A skill for testing. Use this skill when building React components.',
        '---',
        '',
        '# test-react-component',
        '',
        'Test body.',
      ].join('\n')
    );

    try {
      const result = runResearch('react component', ['--json', '--skills-dir', skillsDir]);
      if (result.exitCode !== 0) {
        throw new Error(`期望 exitCode=0，实际 ${result.exitCode}`);
      }
      const matched = result.json.local_skills.find((s) => s.name === 'test-react-component');
      if (!matched) {
        throw new Error('应匹配到 test-react-component');
      }
      if (matched.relevance !== 'high') {
        throw new Error(`期望 relevance=high，实际 ${matched.relevance}`);
      }
    } finally {
      cleanFixtures(path.dirname(tmpParent));
    }
  });

  test('无匹配关键词时返回空列表', () => {
    const tmpParent = createTempSkill('tmp-no-match');
    const skillsDir = path.join(path.dirname(tmpParent), 'skills');
    const skillDir = path.join(skillsDir, 'test-unrelated-skill');
    writeFixture(
      path.join(skillDir, 'SKILL.md'),
      [
        '---',
        'name: test-unrelated-skill',
        'version: 0.1.0',
        'description: >-',
        '  A skill for testing. Use this skill when doing unrelated things.',
        '---',
        '',
        '# test-unrelated-skill',
        '',
        'Test body.',
      ].join('\n')
    );

    try {
      const result = runResearch('docker kubernetes', ['--json', '--skills-dir', skillsDir]);
      if (result.exitCode !== 0) {
        throw new Error(`期望 exitCode=0，实际 ${result.exitCode}`);
      }
      if (result.json.local_skills.length !== 0) {
        throw new Error(`期望 0 个匹配，实际 ${result.json.local_skills.length}`);
      }
    } finally {
      cleanFixtures(path.dirname(tmpParent));
    }
  });
});

suite('research.js 目录处理', () => {
  test('不存在的 skills 目录返回退出码 1', () => {
    const result = runResearch('test', ['--skills-dir', '/nonexistent/path/xyz']);
    if (result.exitCode !== 1) {
      throw new Error(`期望 exitCode=1，实际 ${result.exitCode}`);
    }
  });

  test('空 skills 目录返回空匹配列表', () => {
    const tmpParent = createTempSkill('tmp-empty-dir');
    const skillsDir = path.join(path.dirname(tmpParent), 'empty-skills');
    writeFixture(path.join(skillsDir, '.gitkeep'), '');

    try {
      const result = runResearch('test', ['--json', '--skills-dir', skillsDir]);
      if (result.exitCode !== 0) {
        throw new Error(`期望 exitCode=0，实际 ${result.exitCode}`);
      }
      if (result.json.local_skills.length !== 0) {
        throw new Error(`期望 0 个匹配，实际 ${result.json.local_skills.length}`);
      }
    } finally {
      cleanFixtures(path.dirname(tmpParent));
    }
  });
});

// 运行所有测试后输出总结
summary();
