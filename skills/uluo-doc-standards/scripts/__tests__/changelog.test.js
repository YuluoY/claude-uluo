// changelog.js check module tests
const path = require('path');
const { test, suite, summary, hasFail, noFail, hasWarn, hasPass, writeFixture, cleanFixtures } = require('./helpers');
const { check } = require('../checks/changelog');

const FIXTURES = path.join(__dirname, 'fixtures');
const CL = path.join(FIXTURES, 'CHANGELOG.md');

cleanFixtures(FIXTURES);

suite('CHANGELOG — 版本格式', () => {
  test('pass: 标准格式 ## [1.0.0] - 2026-06-08', () => {
    writeFixture(CL, `# Changelog\n## [1.0.0] - 2026-06-08\n### Added\n- 新功能\n### Fixed\n- 修复 bug`);
    const f = check(CL);
    hasPass(f, '使用标准格式');
    hasPass(f, '使用语义化版本');
  });

  test('fail: 缺少版本标题', () => {
    writeFixture(CL, `# Changelog\n一些变更记录`);
    const f = check(CL);
    hasFail(f, '缺少版本标题');
  });
});

suite('CHANGELOG — 标准分类', () => {
  test('pass: 含 Added/Changed/Fixed/Security', () => {
    writeFixture(CL, `# Changelog\n## [1.0.0] - 2026-06-08\n### Added\n- 新功能\n### Changed\n- 变更\n### Fixed\n- 修复\n### Security\n- 安全修复`);
    const f = check(CL);
    hasPass(f, '使用标准分类');
    hasPass(f, 'Added, Changed, Fixed, Security');
  });

  test('fail: 无标准分类', () => {
    writeFixture(CL, `# Changelog\n## [1.0.0] - 2026-06-08\n### 新增\n- 功能\n### 修复\n- 修复`);
    const f = check(CL);
    hasFail(f, '未使用标准分类');
  });

  test('warn: 分类不足', () => {
    writeFixture(CL, `# Changelog\n## [1.0.0] - 2026-06-08\n### Added\n- 新功能`);
    const f = check(CL);
    hasWarn(f, '标准分类不足');
  });
});

suite('CHANGELOG — 反模式', () => {
  test('warn: 笼统描述"改了很多"', () => {
    writeFixture(CL, `# Changelog\n## [1.0.0] - 2026-06-08\n### Changed\n- 改了很多东西\n### Fixed\n- 修了若干 bug`);
    const f = check(CL);
    hasWarn(f, '条目过于笼统');
  });

  test('warn: "优化了一堆"', () => {
    writeFixture(CL, `# Changelog\n## [1.0.0] - 2026-06-08\n### Changed\n- 优化了一堆性能问题`);
    const f = check(CL);
    hasWarn(f, '过于笼统');
  });

  test('pass: 无笼统描述', () => {
    writeFixture(CL, `# Changelog\n## [1.0.0] - 2026-06-08\n### Added\n- 新增 CSV 导出功能 (#456)\n### Fixed\n- 修复并发写入数据丢失 (#457)\n### Changed\n- 默认分页大小从 10 改为 20 (#458)`);
    const f = check(CL);
    hasPass(f, '无笼统描述');
  });
});

suite('CHANGELOG — Breaking Changes', () => {
  test('pass: Breaking Changes 含迁移说明', () => {
    writeFixture(CL, `# Changelog\n## [2.0.0] - 2026-06-08\n### Breaking Changes\n- **API v1 移除**: 迁移到 v2，替换 /api/v1/users 为 /api/v2/users\n### Added\n- v2 API`);
    const f = check(CL);
    hasPass(f, '含迁移说明');
  });

  test('warn: Breaking Changes 无迁移说明', () => {
    writeFixture(CL, `# Changelog\n## [2.0.0] - 2026-06-08\n### Breaking Changes\n- 移除了 API v1\n### Added\n- v2 API`);
    const f = check(CL);
    hasWarn(f, '缺少迁移说明');
  });
});

cleanFixtures(FIXTURES);
summary();
