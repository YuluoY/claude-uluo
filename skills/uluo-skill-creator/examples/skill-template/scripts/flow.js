#!/usr/bin/env node
'use strict';

const path = require('path');
const { run } = require('./_shared/flow-engine');

const SKILL_ROOT = path.resolve(__dirname, '..');

const META = {
  name: '<skill-name>',
  version: '0.1.0'
};

const WORKFLOW = [
  {
    phase: 0,
    name: '需求收集',
    description: '收集用户需求、明确任务目标、边界条件和验收标准',
    referencesToRead: [],
    requiredActions: [
      '与用户确认任务目标和范围',
      '明确输入输出格式',
      '了解约束条件和特殊要求'
    ],
    expectedOutputs: [
      '清晰的需求描述',
      '明确的验收标准'
    ],
    gates: []
  },
  {
    phase: 1,
    name: '信息准备',
    description: '读取必要的参考文档、加载相关上下文、了解背景知识',
    referencesToRead: [],
    requiredActions: [
      '阅读 referencesToRead 中列出的所有参考文档',
      '理解相关规范和最佳实践',
      '准备必要的上下文信息'
    ],
    expectedOutputs: [
      '相关文档已阅读',
      '背景知识已掌握'
    ],
    gates: []
  },
  {
    phase: 2,
    name: '核心执行',
    description: '执行 skill 的主要任务逻辑，完成核心工作',
    referencesToRead: [],
    requiredActions: [
      '<根据实际任务填写执行步骤1>',
      '<根据实际任务填写执行步骤2>',
      '<根据实际任务填写执行步骤3>'
    ],
    expectedOutputs: [
      '<核心产出物1>',
      '<核心产出物2>'
    ],
    gates: []
  },
  {
    phase: 3,
    name: '质量检查',
    description: '运行硬约束校验脚本，验证执行结果是否符合规范',
    referencesToRead: [],
    requiredActions: [
      '运行校验脚本',
      '修复所有校验失败项',
      '确保所有硬约束通过'
    ],
    expectedOutputs: [
      'validate.js 全部 PASS',
      '所有硬约束满足'
    ],
    gates: [
      {
        type: 'script-exit-code',
        command: 'node scripts/validate.js .',
        description: '硬约束校验必须通过',
        failureSuggestion: '修复校验错误后重试 complete'
      }
    ]
  },
  {
    phase: 4,
    name: '输出交付',
    description: '整理结果、生成最终输出、确保交付物完整',
    referencesToRead: [],
    requiredActions: [
      '检查 SKILL.md 是否完整',
      '整理最终输出格式',
      '确认所有交付物已就绪'
    ],
    expectedOutputs: [
      '完整的 SKILL.md',
      '所有必需文件已创建'
    ],
    gates: [
      {
        type: 'file-exists',
        path: 'SKILL.md',
        description: 'SKILL.md 必须存在',
        failureSuggestion: '请确保 SKILL.md 已创建并完整'
      }
    ]
  }
];

const SCENARIOS = {
  simple: {
    autoSkipPhases: [1],
    description: '简单任务：跳过信息准备，快速执行核心流程'
  },
  medium: {
    autoSkipPhases: [],
    description: '标准任务：完整流程，默认场景'
  },
  complex: {
    autoSkipPhases: [],
    description: '复杂任务：完整流程 + 全面质量检查'
  },
  urgent: {
    autoSkipPhases: [1, 3],
    description: '紧急任务：跳过信息准备和质量检查，快速交付'
  }
};

run({
  skillRoot: SKILL_ROOT,
  META,
  WORKFLOW,
  SCENARIOS
}, process.argv.slice(2));
