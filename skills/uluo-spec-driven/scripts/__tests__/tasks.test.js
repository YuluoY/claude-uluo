// tasks.js check module tests
const path = require('path');
const { test, suite, summary, hasFail, noFail, hasWarn, hasPass, writeFixture, cleanFixtures } = require('./helpers');
const { check } = require('../checks/tasks');

const FIXTURES = path.join(__dirname, 'fixtures');
const TASKS = path.join(FIXTURES, 'tasks-test.md');

cleanFixtures(FIXTURES);

suite('tasks — 任务字段完整性', () => {
  test('pass: 全部字段完整', () => {
    writeFixture(TASKS, `# Phase 1\n## 本阶段任务\n- [ ] **T1.1**: 创建表\n  - **产出物**: \`db/migration/V1.sql\`（新增）\n  - **参考**: 参考 \`V0_init.sql\` 的命名风格\n  - **复用**: 直接使用已有的 DataSource\n  - **验收**: 表创建成功\n  - **预估**: 1h\n  - **依赖**: 无\n- [ ] **T1.2**: 实现 Repo\n  - **产出物**: \`user/repository/UserRepo.java\`（新增）\n  - **参考**: 参考 \`order/repository/OrderRepo.java\`\n  - **复用**: 调用已有的 DataSource\n  - **验收**: 单元测试通过\n  - **预估**: 2h\n  - **依赖**: T1.1`);
    const f = check(TASKS);
    hasPass(f, '2 个任务均含产出物路径');
    hasPass(f, '参考代码');
    hasPass(f, '工时在 0.5h-4h');
  });

  test('fail: 任务缺少产出物和参考', () => {
    writeFixture(TASKS, `# Phase 1\n## 本阶段任务\n- [ ] **T1.1**: 随便写\n  - **描述**: 没有产出物和参考\n- [ ] **T1.2**: 也没有\n  - **描述**: 同样缺失`);
    const f = check(TASKS);
    hasFail(f, '2/2.*缺少.*产出物');
    hasFail(f, '2/2.*缺少.*参考');
  });

  test('warn: 缺少复用和验收', () => {
    writeFixture(TASKS, `# Phase 1\n## 本阶段任务\n- [ ] **T1.1**: 实现\n  - **产出物**: \`Service.java\`（新增）\n  - **参考**: 参考 OrderService`);
    const f = check(TASKS);
    hasWarn(f, '缺少.*复用');
    hasWarn(f, '缺少.*验收');
  });
});

suite('tasks — 产出物路径', () => {
  test('pass: 产出物含完整包路径', () => {
    writeFixture(TASKS, `# Phase 1\n## 本阶段任务\n- [ ] **T1.1**: 实现\n  - **产出物**: \`user/service/UserService.java\`（新增）\n  - **参考**: 参考 OrderService`);
    const f = check(TASKS);
    hasPass(f, '1 个产出物标注了完整路径');
  });

  test('warn: 产出物路径不够具体', () => {
    writeFixture(TASKS, `# Phase 1\n## 本阶段任务\n- [ ] **T1.1**: 新建 Service\n  - **产出物**: 新增 UserService.java\n  - **参考**: 参考 OrderService`);
    const f = check(TASKS);
    hasWarn(f, '产出物路径不够具体');
  });
});

suite('tasks — 工时范围', () => {
  test('pass: 工时在合理范围', () => {
    writeFixture(TASKS, `# Phase 1\n## 本阶段任务\n- [ ] **T1.1**: 任务\n  - **产出物**: \`Service.java\`\n  - **参考**: 参考 X\n  - **预估**: 2h`);
    const f = check(TASKS);
    hasPass(f, '工时在 0.5h-4h');
  });

  test('warn: 工时过低', () => {
    writeFixture(TASKS, `# Phase 1\n## 本阶段任务\n- [ ] **T1.1**: 太碎\n  - **产出物**: \`Service.java\`\n  - **参考**: 参考 X\n  - **预估**: 0.1h`);
    const f = check(TASKS);
    hasWarn(f, '工时.*过低');
  });

  test('warn: 工时过高', () => {
    writeFixture(TASKS, `# Phase 1\n## 本阶段任务\n- [ ] **T1.1**: 太大\n  - **产出物**: \`Service.java\`\n  - **参考**: 参考 X\n  - **预估**: 10h`);
    const f = check(TASKS);
    hasWarn(f, '工时.*过高');
  });
});

suite('tasks — 空文件/边界', () => {
  test('fail: 没有任务条目', () => {
    writeFixture(TASKS, `# Phase 1\n## 本阶段任务\n暂无。`);
    const f = check(TASKS);
    hasFail(f, '未找到任务条目');
  });

  test('fail: 文件不存在', () => {
    const f = check('/nonexistent/tasks.md');
    hasFail(f, '无法读取');
  });
});

cleanFixtures(FIXTURES);
summary();
