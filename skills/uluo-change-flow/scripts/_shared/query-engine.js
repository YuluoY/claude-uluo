'use strict';

const path = require('path');
const fs = require('fs');
const { COLORS: { RED, GREEN, YELLOW, CYAN, MAGENTA, BOLD, NC }, fatal } = require('./cli');

function normalizeScenarios(scenarios) {
  const normalized = {};
  for (const [key, value] of Object.entries(scenarios)) {
    const autoSkipPhases = value.autoSkipPhases || value.skipPhases || [];
    normalized[key] = {
      ...value,
      autoSkipPhases,
      skipPhases: autoSkipPhases
    };
  }
  return normalized;
}

function parseEngineArgs(argv) {
  const result = {
    help: false,
    type: null,
    scenario: null,
    level: null,
    pretty: false,
    target: '.'
  };

  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      result.help = true;
    } else if (arg === '--type') {
      i++;
      result.type = argv[i] !== undefined ? argv[i] : null;
    } else if (arg === '--scenario') {
      i++;
      result.scenario = argv[i] !== undefined ? argv[i] : null;
    } else if (arg === '--level') {
      i++;
      result.level = argv[i] !== undefined ? argv[i] : null;
    } else if (arg === '--pretty') {
      result.pretty = true;
    } else if (!arg.startsWith('--')) {
      result.target = arg;
    }
    i++;
  }

  return result;
}

function getSupportedTypes(config) {
  const types = ['meta', 'workflow'];
  if (config.SCENARIOS && Object.keys(config.SCENARIOS).length > 0) {
    types.push('scenario');
    if (config.complexityAliases || true) {
      types.push('complexity');
    }
  }
  if (config.REFERENCES) types.push('references');
  if (config.AGENTS) types.push('agents');
  if (config.SCRIPTS) types.push('scripts');
  if (config.CONSTRAINTS) types.push('constraints');
  return types;
}

function queryData(config, type, scenario, level, skillPath) {
  const normalizedScenarios = normalizeScenarios(config.SCENARIOS || {});
  const query = {};
  let data;

  switch (type) {
    case 'meta':
      data = config.META;
      break;
    case 'workflow':
      data = config.WORKFLOW;
      break;
    case 'scenario': {
      if (!scenario) {
        throw new Error('--type scenario 需要配合 --scenario 参数');
      }
      if (!normalizedScenarios[scenario]) {
        const available = Object.keys(normalizedScenarios).join('/');
        throw new Error(`未知场景: ${scenario}（可选: ${available}）`);
      }
      query.scenario = scenario;
      data = normalizedScenarios[scenario];
      break;
    }
    case 'complexity': {
      if (!level) {
        throw new Error('--type complexity 需要配合 --level 参数');
      }
      if (!normalizedScenarios[level]) {
        const available = Object.keys(normalizedScenarios).join('/');
        throw new Error(`未知复杂度级别: ${level}（可选: ${available}）`);
      }
      query.level = level;
      data = normalizedScenarios[level];
      break;
    }
    case 'references':
      data = config.REFERENCES || [];
      break;
    case 'agents':
      data = config.AGENTS || [];
      break;
    case 'scripts':
      data = config.SCRIPTS || [];
      break;
    case 'constraints':
      data = config.CONSTRAINTS || {};
      break;
    default: {
      const supported = getSupportedTypes(config).join('/');
      throw new Error(`未知查询类型: ${type}（支持: ${supported}）`);
    }
  }

  return { type, query, data };
}

function printPretty(config, result, skillPath) {
  const title = config.META.name;
  const workflowLen = config.WORKFLOW.length;
  const firstPhase = config.WORKFLOW[0] ? config.WORKFLOW[0].phase : 0;
  const lastPhase = config.WORKFLOW[workflowLen - 1] ? config.WORKFLOW[workflowLen - 1].phase : workflowLen - 1;
  const normalizedScenarios = normalizeScenarios(config.SCENARIOS || {});
  const scenarioKeys = Object.keys(normalizedScenarios);

  console.log(`\n${BOLD}${CYAN}${title} 查询结果${NC}`);
  console.log('─────────────────────────────────────────────────────────');
  console.log(`${BOLD}路径:${NC} ${skillPath}`);
  console.log(`${BOLD}查询类型:${NC} ${CYAN}${result.type}${NC}`);
  console.log('');

  const { data } = result;

  switch (result.type) {
    case 'meta':
      console.log(`${BOLD}${GREEN}元信息${NC}`);
      console.log(`  ${BOLD}名称:${NC}        ${data.name}`);
      console.log(`  ${BOLD}版本:${NC}        ${data.version}`);
      console.log(`  ${BOLD}描述:${NC}        ${data.description}`);
      break;

    case 'workflow':
      console.log(`${BOLD}${GREEN}工作流 Phase (${firstPhase}-${lastPhase})${NC}`);
      for (const phase of data) {
        console.log(`\n  ${BOLD}Phase ${phase.phase}:${NC} ${YELLOW}${phase.name}${NC}`);
        console.log(`    ${phase.description}`);
      }
      break;

    case 'scenario':
    case 'complexity': {
      const key = result.type === 'scenario' ? result.query.scenario : result.query.level;
      const label = result.type === 'scenario' ? '场景' : '复杂度';
      console.log(`${BOLD}${GREEN}${label}配置: ${MAGENTA}${key}${NC}`);
      console.log(`  ${BOLD}描述:${NC}        ${data.description}`);
      const skipList = data.autoSkipPhases.length > 0 ? data.autoSkipPhases.map(p => `Phase ${p}`).join(', ') : '无';
      console.log(`  ${BOLD}跳过阶段:${NC}    ${skipList}`);
      if (data.documents && data.documents.length > 0) {
        console.log(`  ${BOLD}必需文档:${NC}`);
        for (const doc of data.documents) {
          console.log(`    - ${doc}`);
        }
      }
      if (data.agents && data.agents.length > 0) {
        console.log(`  ${BOLD}使用 Agents:${NC}`);
        for (const agent of data.agents) {
          console.log(`    - ${agent}`);
        }
      }
      break;
    }

    case 'references':
      console.log(`${BOLD}${GREEN}参考文档列表${NC}`);
      for (const ref of data) {
        console.log(`\n  ${BOLD}${CYAN}${ref.file}${NC}`);
        console.log(`    使用时机: ${ref.when}`);
      }
      break;

    case 'agents':
      console.log(`${BOLD}${GREEN}Agents 列表${NC}`);
      for (const agent of data) {
        console.log(`\n  ${BOLD}${CYAN}${agent.file}${NC}`);
        console.log(`    适用阶段: ${agent.phases.map(p => `Phase ${p}`).join(', ')}`);
        console.log(`    描述: ${agent.description}`);
      }
      break;

    case 'scripts':
      console.log(`${BOLD}${GREEN}脚本列表${NC}`);
      for (const script of data) {
        console.log(`\n  ${BOLD}${CYAN}${script.file}${NC}`);
        console.log(`    用法: ${script.usage}`);
        console.log(`    描述: ${script.description}`);
      }
      break;

    case 'constraints':
      console.log(`${BOLD}${GREEN}软硬约束说明${NC}`);
      if (data.HARD) {
        console.log(`\n  ${BOLD}${RED}HARD (硬约束)${NC}`);
        console.log(`    内容: ${data.HARD.description}`);
        console.log(`    执行: ${data.HARD.enforcement}`);
      }
      if (data.SOFT) {
        console.log(`\n  ${BOLD}${YELLOW}SOFT (软约束)${NC}`);
        console.log(`    内容: ${data.SOFT.description}`);
        console.log(`    执行: ${data.SOFT.enforcement}`);
      }
      break;
  }

  console.log('');
}

function run(config, argv) {
  const args = parseEngineArgs(argv);

  if (args.help) {
    const title = config.META.name;
    const normalizedScenarios = normalizeScenarios(config.SCENARIOS || {});
    const scenarioKeys = Object.keys(normalizedScenarios);
    const supportedTypes = getSupportedTypes(config);
    const workflowLen = config.WORKFLOW.length;
    const firstPhase = config.WORKFLOW[0] ? config.WORKFLOW[0].phase : 0;
    const lastPhase = config.WORKFLOW[workflowLen - 1] ? config.WORKFLOW[workflowLen - 1].phase : workflowLen - 1;

    console.log(`\n${BOLD}${CYAN}${title} 流程数据查询工具${NC}`);
    console.log('─────────────────────────────────────────────────────────');
    console.log('');
    console.log(`${BOLD}用法:${NC}`);
    console.log(`  node <script> ${GREEN}[options]${NC} ${YELLOW}<path>${NC}`);
    console.log('');
    console.log(`${BOLD}参数:${NC}`);
    console.log(`  ${YELLOW}<path>${NC}               目标目录路径（默认: "."）`);
    console.log(`  ${GREEN}--help, -h${NC}           显示此帮助信息`);
    console.log(`  ${GREEN}--type <type>${NC}        查询类型（必需）`);
    console.log(`  ${GREEN}--scenario <name>${NC}    场景名称（配合 --type scenario 使用）`);
    console.log(`  ${GREEN}--level <level>${NC}      复杂度级别（配合 --type complexity 使用）`);
    console.log(`  ${GREEN}--pretty${NC}             人类可读格式输出（默认: JSON）`);
    console.log('');
    console.log(`${BOLD}查询类型 (--type):${NC}`);
    for (const t of supportedTypes) {
      let desc = '';
      switch (t) {
        case 'meta': desc = '元信息（名称、版本、描述）'; break;
        case 'workflow': desc = `工作流（Phase ${firstPhase}-${lastPhase}）`; break;
        case 'scenario': desc = '场景配置（需配合 --scenario）'; break;
        case 'complexity': desc = '复杂度配置（需配合 --level）'; break;
        case 'references': desc = '参考文档列表'; break;
        case 'agents': desc = 'Agent 列表'; break;
        case 'scripts': desc = '脚本列表'; break;
        case 'constraints': desc = '软硬约束说明'; break;
      }
      console.log(`  ${CYAN}${t}${NC}${' '.repeat(Math.max(1, 14 - t.length))}${desc}`);
    }
    if (scenarioKeys.length > 0) {
      console.log('');
      console.log(`${BOLD}场景/复杂度级别:${NC}`);
      for (const s of scenarioKeys) {
        console.log(`  ${MAGENTA}${s}${NC}`);
      }
    }
    console.log('');
    process.exit(0);
  }

  if (!args.type) {
    console.error(`${RED}错误: 必须指定 --type 参数${NC}`);
    console.log(`使用 ${CYAN}--help${NC} 查看用法`);
    process.exit(1);
  }

  const targetPath = path.resolve(args.target);

  if (!fs.existsSync(targetPath)) {
    console.error(`${RED}错误: 路径不存在: ${targetPath}${NC}`);
    process.exit(1);
  }

  let result;
  try {
    result = queryData(config, args.type, args.scenario, args.level, targetPath);
  } catch (e) {
    console.error(`${RED}错误: ${e.message}${NC}`);
    process.exit(1);
  }

  if (args.pretty) {
    printPretty(config, result, targetPath);
  } else {
    console.log(JSON.stringify(result, null, 2));
  }

  process.exit(0);
}

module.exports = { run };
