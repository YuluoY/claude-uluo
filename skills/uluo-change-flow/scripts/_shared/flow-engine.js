'use strict';

const fs = require('fs');
const path = require('path');
const child_process = require('child_process');
const { COLORS: { RED, GREEN, YELLOW, CYAN, MAGENTA, BOLD, NC }, fatal } = require('./cli');

const STATE_FILE = '.skill-state.json';

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
    pretty: false,
    json: false,
    target: '.',
    command: null,
    positional: [],
    options: {}
  };

  let i = 0;

  while (i < argv.length) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h' || arg === 'help') {
      result.help = true;
    } else if (arg === '--pretty') {
      result.pretty = true;
    } else if (arg === '--json') {
      result.json = true;
    } else if (arg.startsWith('--')) {
      const key = arg.slice(2);
      i++;
      result.options[key] = argv[i] !== undefined ? argv[i] : true;
    } else if (!result.command && result.target === '.' && !arg.startsWith('-')) {
      const commands = ['init', 'next', 'complete', 'status', 'rollback', 'gates', 'skip'];
      if (commands.includes(arg)) {
        result.command = arg;
      } else {
        result.target = arg;
      }
    } else if (!result.command) {
      result.command = arg;
    } else {
      result.positional.push(arg);
    }
    i++;
  }

  return result;
}

function getStateFilePath(skillPath) {
  return path.join(skillPath, STATE_FILE);
}

function readState(skillPath) {
  const statePath = getStateFilePath(skillPath);
  if (!fs.existsSync(statePath)) {
    return null;
  }
  const content = fs.readFileSync(statePath, 'utf-8');
  return JSON.parse(content);
}

function writeState(skillPath, state) {
  const statePath = getStateFilePath(skillPath);
  const tmpPath = statePath + '.tmp';
  state.updatedAt = new Date().toISOString();
  fs.writeFileSync(tmpPath, JSON.stringify(state, null, 2), 'utf-8');
  fs.renameSync(tmpPath, statePath);
}

function deleteState(skillPath) {
  const statePath = getStateFilePath(skillPath);
  if (fs.existsSync(statePath)) {
    fs.unlinkSync(statePath);
    return true;
  }
  return false;
}

// 状态文件是运行时产物，不入库：init 时自动向 git 根目录 .gitignore 追加忽略条目
function ensureGitignoreEntry(skillPath) {
  let gitRoot = null;
  try {
    gitRoot = child_process.execSync('git rev-parse --show-toplevel', {
      cwd: skillPath, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch (e) {
    return 'not-a-git-repo';
  }
  if (!gitRoot) return 'not-a-git-repo';

  const gitignorePath = path.join(gitRoot, '.gitignore');
  let content = '';
  if (fs.existsSync(gitignorePath)) {
    content = fs.readFileSync(gitignorePath, 'utf-8');
    if (content.split('\n').some(line => line.trim() === STATE_FILE)) {
      return 'already-ignored';
    }
  }
  const prefix = content && !content.endsWith('\n') ? '\n' : '';
  const header = content.includes('# uluo skill flow runtime state') ? '' : '# uluo skill flow runtime state\n';
  fs.appendFileSync(gitignorePath, `${prefix}${header}${STATE_FILE}\n`, 'utf-8');
  return 'updated';
}

function resolveScriptCommand(command, skillRoot) {
  const parts = command.split(' ');
  const cmd = parts[0];
  const cmdArgs = parts.slice(1);
  const resolvedArgs = cmdArgs.map(arg => {
    if (arg.startsWith('scripts/') || arg.startsWith('./')) {
      return path.resolve(skillRoot, arg);
    }
    return arg;
  });
  return { cmd, args: resolvedArgs };
}

function runGates(gates, skillPath, config) {
  const results = [];
  let allPassed = true;

  for (const gate of gates) {
    let result;
    switch (gate.type) {
      case 'file-exists': {
        const filePath = path.resolve(skillPath, gate.path);
        const exists = fs.existsSync(filePath);
        result = {
          gate,
          passed: exists,
          reason: exists ? null : `文件不存在: ${gate.path}`,
          suggestion: exists ? null : gate.failureSuggestion
        };
        break;
      }
      case 'dir-exists': {
        const dirPath = path.resolve(skillPath, gate.path);
        const exists = fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
        result = {
          gate,
          passed: exists,
          reason: exists ? null : `目录不存在: ${gate.path}`,
          suggestion: exists ? null : gate.failureSuggestion
        };
        break;
      }
      case 'script-exit-code': {
        try {
          const { cmd, args } = resolveScriptCommand(gate.command, config.skillRoot);
          const execResult = child_process.spawnSync(cmd, args, {
            cwd: skillPath,
            encoding: 'utf-8',
            stdio: 'pipe'
          });
          const passed = execResult.status === 0;
          result = {
            gate,
            passed,
            reason: passed ? null : `脚本退出码: ${execResult.status}\n${execResult.stderr || execResult.stdout || ''}`,
            suggestion: passed ? null : gate.failureSuggestion
          };
        } catch (e) {
          result = {
            gate,
            passed: false,
            reason: `脚本执行失败: ${e.message}`,
            suggestion: gate.failureSuggestion
          };
        }
        break;
      }
      default:
        result = {
          gate,
          passed: false,
          reason: `未知门控类型: ${gate.type}`,
          suggestion: '检查门控配置'
        };
    }
    if (!result.passed) allPassed = false;
    results.push(result);
  }

  return { allPassed, results };
}

function isPhaseSkipped(state, phaseId) {
  return state.autoSkippedPhases.includes(phaseId) || state.manualSkippedPhases.includes(phaseId);
}

function findNextPhase(currentPhase, autoSkippedPhases, manualSkippedPhases, completedPhases, workflowLength) {
  const skipped = new Set([...autoSkippedPhases, ...manualSkippedPhases]);
  const completed = new Set(completedPhases);
  for (let p = currentPhase + 1; p < workflowLength; p++) {
    if (!skipped.has(p) && !completed.has(p)) {
      return p;
    }
  }
  return null;
}

function getPhaseById(workflow, phaseId) {
  return workflow.find(p => p.phase === phaseId);
}

function isPhaseCompleted(state, phaseId) {
  return state.completedPhases.includes(phaseId);
}

function getTotalPhases(state, workflow) {
  return workflow.filter(p => !isPhaseSkipped(state, p.phase)).length;
}

function getCompletedCount(state) {
  return state.completedPhases.length;
}

function getProgress(state, workflow) {
  const total = getTotalPhases(state, workflow);
  if (total === 0) return 100;
  return Math.round((getCompletedCount(state) / total) * 100);
}

function getPendingPhases(state, workflow) {
  return workflow
    .filter(p => !isPhaseSkipped(state, p.phase) && !isPhaseCompleted(state, p.phase))
    .map(p => p.phase);
}

function renderProgressBar(progress, width = 16) {
  const filled = Math.round((progress / 100) * width);
  const empty = width - filled;
  return '[' + GREEN + '█'.repeat(filled) + NC + '░'.repeat(empty) + ']';
}

function createInitialState(scenario, normalizedScenarios) {
  const now = new Date().toISOString();
  return {
    scenario,
    currentPhase: 0,
    completedPhases: [],
    autoSkippedPhases: [...normalizedScenarios[scenario].autoSkipPhases],
    manualSkippedPhases: [],
    completed: false,
    history: [{ action: 'init', scenario, timestamp: now }],
    createdAt: now,
    updatedAt: now
  };
}

function cmdInit(args, skillPath, config) {
  const normalizedScenarios = normalizeScenarios(config.SCENARIOS || {});
  const scenarioKeys = Object.keys(normalizedScenarios);
  const scenario = args.options.scenario;

  if (!scenario) {
    return { success: false, error: `init 命令需要 --scenario 参数（${scenarioKeys.join('/')}）`, exitCode: 1 };
  }
  if (!normalizedScenarios[scenario]) {
    return { success: false, error: `未知场景: ${scenario}（可选: ${scenarioKeys.join('/')}）`, exitCode: 1 };
  }

  const existingState = readState(skillPath);
  if (existingState) {
    return { success: false, error: '流程已初始化，如需重置请使用 rollback 0', exitCode: 1 };
  }

  const state = createInitialState(scenario, normalizedScenarios);

  let current = state.currentPhase;
  while (current !== null && isPhaseSkipped(state, current)) {
    current = findNextPhase(current, state.autoSkippedPhases, state.manualSkippedPhases, state.completedPhases, config.WORKFLOW.length);
  }
  if (current !== null) {
    state.currentPhase = current;
  } else {
    state.completed = true;
  }

  writeState(skillPath, state);

  return {
    success: true,
    data: {
      scenario: state.scenario,
      currentPhase: state.currentPhase,
      autoSkippedPhases: state.autoSkippedPhases,
      completed: state.completed,
      createdAt: state.createdAt,
      gitignore: ensureGitignoreEntry(skillPath)
    }
  };
}

function cmdNext(args, skillPath, config) {
  const state = readState(skillPath);
  if (!state) {
    return { success: false, error: '流程未初始化，请先执行 init', exitCode: 1 };
  }
  if (state.completed) {
    return { success: true, data: { completed: true }, exitCode: 2 };
  }

  const phase = getPhaseById(config.WORKFLOW, state.currentPhase);
  if (!phase) {
    return { success: false, error: `无效的当前阶段: ${state.currentPhase}`, exitCode: 1 };
  }

  return {
    success: true,
    data: {
      phaseId: phase.phase,
      phaseName: phase.name,
      description: phase.description,
      referencesToRead: phase.referencesToRead,
      requiredActions: phase.requiredActions,
      expectedOutputs: phase.expectedOutputs,
      gates: phase.gates.map(g => ({ type: g.type, description: g.description }))
    }
  };
}

function cmdComplete(args, skillPath, config) {
  const phaseIdStr = args.positional[0];
  const note = args.options.note;

  if (phaseIdStr === undefined) {
    return { success: false, error: 'complete 命令需要指定 phaseId', exitCode: 1 };
  }
  const phaseId = parseInt(phaseIdStr, 10);
  if (isNaN(phaseId)) {
    return { success: false, error: `无效的 phaseId: ${phaseIdStr}`, exitCode: 1 };
  }

  const state = readState(skillPath);
  if (!state) {
    return { success: false, error: '流程未初始化，请先执行 init', exitCode: 1 };
  }
  if (state.completed) {
    return { success: false, error: '流程已完成', exitCode: 1 };
  }
  if (state.currentPhase !== phaseId) {
    return { success: false, error: `phaseId 不匹配，当前阶段为 ${state.currentPhase}`, exitCode: 1 };
  }

  const phase = getPhaseById(config.WORKFLOW, phaseId);
  const gateResults = phase ? runGates(phase.gates || [], skillPath, config) : { allPassed: true, results: [] };

  if (!gateResults.allPassed) {
    const failures = gateResults.results.filter(r => !r.passed);
    return {
      success: false,
      error: '门控校验未通过',
      gateFailures: failures.map(f => ({
        gate: f.gate.type,
        description: f.gate.description,
        reason: f.reason,
        suggestion: f.suggestion
      })),
      exitCode: 1
    };
  }

  if (!state.completedPhases.includes(phaseId)) {
    state.completedPhases.push(phaseId);
  }

  const historyEntry = { action: 'complete', phase: phaseId, timestamp: new Date().toISOString() };
  if (note) historyEntry.note = note;
  state.history.push(historyEntry);

  let nextPhase = findNextPhase(phaseId, state.autoSkippedPhases, state.manualSkippedPhases, state.completedPhases, config.WORKFLOW.length);
  while (nextPhase !== null && isPhaseSkipped(state, nextPhase)) {
    nextPhase = findNextPhase(nextPhase, state.autoSkippedPhases, state.manualSkippedPhases, state.completedPhases, config.WORKFLOW.length);
  }

  if (nextPhase === null) {
    state.completed = true;
    state.history.push({ action: 'finish', timestamp: new Date().toISOString() });
    deleteState(skillPath);
  } else {
    state.currentPhase = nextPhase;
    writeState(skillPath, state);
  }

  const data = {
    completedPhase: phaseId,
    nextPhase: state.completed ? null : state.currentPhase,
    completed: state.completed,
    progress: getProgress(state, config.WORKFLOW)
  };
  if (state.completed) data.stateCleanedUp = true;

  return { success: true, data };
}

function cmdStatus(args, skillPath, config) {
  const state = readState(skillPath);
  if (!state) {
    return { success: false, error: '流程未初始化，请先执行 init', exitCode: 1 };
  }

  const currentPhase = getPhaseById(config.WORKFLOW, state.currentPhase);
  return {
    success: true,
    data: {
      scenario: state.scenario,
      currentPhase: state.currentPhase,
      currentPhaseName: currentPhase ? currentPhase.name : null,
      completedPhases: state.completedPhases,
      autoSkippedPhases: state.autoSkippedPhases,
      manualSkippedPhases: state.manualSkippedPhases,
      pendingPhases: getPendingPhases(state, config.WORKFLOW),
      totalPhases: getTotalPhases(state, config.WORKFLOW),
      completedCount: getCompletedCount(state),
      progress: getProgress(state, config.WORKFLOW),
      completed: state.completed,
      lastError: state.lastError || null
    }
  };
}

function cmdRollback(args, skillPath, config) {
  const phaseIdStr = args.positional[0];
  if (phaseIdStr === undefined) {
    return { success: false, error: 'rollback 命令需要指定 phaseId', exitCode: 1 };
  }
  const phaseId = parseInt(phaseIdStr, 10);
  if (isNaN(phaseId) || phaseId < 0 || phaseId >= config.WORKFLOW.length) {
    return { success: false, error: `无效的 phaseId: ${phaseIdStr}`, exitCode: 1 };
  }

  const state = readState(skillPath);
  if (!state) {
    return { success: false, error: '流程未初始化，请先执行 init', exitCode: 1 };
  }

  state.currentPhase = phaseId;
  state.completedPhases = state.completedPhases.filter(p => p < phaseId);
  state.completed = false;
  state.lastError = null;
  state.history.push({ action: 'rollback', phase: phaseId, timestamp: new Date().toISOString() });

  writeState(skillPath, state);

  return {
    success: true,
    data: {
      rolledBackTo: phaseId,
      currentPhase: state.currentPhase,
      completedPhases: state.completedPhases
    }
  };
}

function cmdGates(args, skillPath, config) {
  let phaseId = null;
  if (args.positional[0] !== undefined) {
    phaseId = parseInt(args.positional[0], 10);
  }

  const state = readState(skillPath);
  if (!state) {
    return { success: false, error: '流程未初始化，请先执行 init', exitCode: 1 };
  }
  if (state.completed) {
    return { success: true, data: { completed: true, gates: [] } };
  }

  const targetPhaseId = phaseId !== null && !isNaN(phaseId) ? phaseId : state.currentPhase;
  const phase = getPhaseById(config.WORKFLOW, targetPhaseId);
  if (!phase) {
    return { success: false, error: `无效的阶段: ${targetPhaseId}`, exitCode: 1 };
  }

  const gateRunResult = runGates(phase.gates || [], skillPath, config);

  return {
    success: true,
    data: {
      phaseId: phase.phase,
      phaseName: phase.name,
      gates: phase.gates.map(g => ({
        type: g.type,
        description: g.description,
        check: g.path || g.command,
        failureSuggestion: g.failureSuggestion
      })),
      gateResults: gateRunResult.results.map(r => ({
        type: r.gate.type,
        description: r.gate.description,
        passed: r.passed,
        reason: r.reason,
        suggestion: r.suggestion
      })),
      allPassed: gateRunResult.allPassed
    }
  };
}

function cmdSkip(args, skillPath, config) {
  const phaseIdStr = args.positional[0];
  const reason = args.options.reason;

  if (phaseIdStr === undefined) {
    return { success: false, error: 'skip 命令需要指定 phaseId', exitCode: 1 };
  }
  const phaseId = parseInt(phaseIdStr, 10);
  if (isNaN(phaseId) || phaseId < 0 || phaseId >= config.WORKFLOW.length) {
    return { success: false, error: `无效的 phaseId: ${phaseIdStr}`, exitCode: 1 };
  }
  if (!reason || reason === true) {
    return { success: false, error: 'skip 命令需要 --reason 参数说明理由', exitCode: 1 };
  }

  const state = readState(skillPath);
  if (!state) {
    return { success: false, error: '流程未初始化，请先执行 init', exitCode: 1 };
  }

  if (state.autoSkippedPhases.includes(phaseId)) {
    return { success: false, error: `Phase ${phaseId} 已被场景自动跳过`, exitCode: 1 };
  }
  if (state.completedPhases.includes(phaseId)) {
    return { success: false, error: `Phase ${phaseId} 已完成，无法跳过`, exitCode: 1 };
  }
  if (state.manualSkippedPhases.includes(phaseId)) {
    return { success: false, error: `Phase ${phaseId} 已被手动跳过`, exitCode: 1 };
  }

  state.manualSkippedPhases.push(phaseId);
  state.history.push({ action: 'skip', phase: phaseId, reason, timestamp: new Date().toISOString() });

  if (state.currentPhase === phaseId) {
    let nextPhase = findNextPhase(phaseId, state.autoSkippedPhases, state.manualSkippedPhases, state.completedPhases, config.WORKFLOW.length);
    while (nextPhase !== null && isPhaseSkipped(state, nextPhase)) {
      nextPhase = findNextPhase(nextPhase, state.autoSkippedPhases, state.manualSkippedPhases, state.completedPhases, config.WORKFLOW.length);
    }
    if (nextPhase === null) {
      state.completed = true;
      state.history.push({ action: 'finish', timestamp: new Date().toISOString() });
    } else {
      state.currentPhase = nextPhase;
    }
  }

  if (state.completed) {
    deleteState(skillPath);
  } else {
    writeState(skillPath, state);
  }

  const data = {
    skippedPhase: phaseId,
    reason,
    currentPhase: state.completed ? null : state.currentPhase,
    completed: state.completed,
    progress: getProgress(state, config.WORKFLOW)
  };
  if (state.completed) data.stateCleanedUp = true;

  return { success: true, data };
}

function cmdCleanup(args, skillPath) {
  const removed = deleteState(skillPath);
  return {
    success: true,
    data: {
      stateFile: STATE_FILE,
      removed,
      message: removed
        ? `已清理运行时状态文件 ${STATE_FILE}`
        : `无 ${STATE_FILE}，无需清理`
    }
  };
}

function printPretty(result, command, skillPath, config) {
  const title = config.META ? config.META.name : '流程控制器';

  if (!result.success) {
    console.log(`\n${BOLD}${RED}错误${NC}`);
    console.log(`  ${result.error}`);
    if (result.gateFailures && result.gateFailures.length > 0) {
      console.log('');
      console.log(`${BOLD}${RED}门控失败项:${NC}`);
      for (const f of result.gateFailures) {
        console.log(`  ${RED}✗${NC} [${f.gate}] ${f.description}`);
        console.log(`    原因: ${f.reason}`);
        console.log(`    建议: ${f.suggestion}`);
      }
    }
    console.log('');
    return;
  }

  const data = result.data;

  switch (command) {
    case 'init':
      console.log(`\n${BOLD}${GREEN}流程初始化成功${NC}`);
      console.log('─────────────────────────────────────────────────────────');
      console.log(`${BOLD}场景:${NC}     ${MAGENTA}${data.scenario}${NC}`);
      console.log(`${BOLD}当前阶段:${NC} Phase ${data.currentPhase}`);
      console.log(`${BOLD}自动跳过:${NC} ${data.autoSkippedPhases.length > 0 ? data.autoSkippedPhases.map(p => `Phase ${p}`).join(', ') : '无'}`);
      if (data.gitignore === 'updated') {
        console.log(`${BOLD}gitignore:${NC} 已追加 ${STATE_FILE} 忽略条目`);
      }
      console.log('');
      break;

    case 'next':
      if (data.completed) {
        console.log(`\n${BOLD}${GREEN}流程已完成！${NC}\n`);
        break;
      }
      console.log(`\n${BOLD}${CYAN}当前阶段指引${NC}`);
      console.log('─────────────────────────────────────────────────────────');
      console.log(`${BOLD}Phase ${data.phaseId}:${NC} ${YELLOW}${data.phaseName}${NC}`);
      console.log(`${BOLD}描述:${NC} ${data.description}`);
      console.log('');
      if (data.referencesToRead && data.referencesToRead.length > 0) {
        console.log(`${BOLD}${MAGENTA}需要阅读的参考文档:${NC}`);
        for (const ref of data.referencesToRead) {
          console.log(`  - ${ref}`);
        }
        console.log('');
      }
      if (data.requiredActions && data.requiredActions.length > 0) {
        console.log(`${BOLD}${GREEN}需要执行的动作:${NC}`);
        for (const action of data.requiredActions) {
          console.log(`  - ${action}`);
        }
        console.log('');
      }
      if (data.expectedOutputs && data.expectedOutputs.length > 0) {
        console.log(`${BOLD}${CYAN}预期产出物:${NC}`);
        for (const output of data.expectedOutputs) {
          console.log(`  - ${output}`);
        }
        console.log('');
      }
      if (data.gates && data.gates.length > 0) {
        console.log(`${BOLD}${YELLOW}门控项 (${data.gates.length}):${NC}`);
        for (const gate of data.gates) {
          console.log(`  - [${gate.type}] ${gate.description}`);
        }
        console.log('');
      }
      break;

    case 'complete':
      console.log(`\n${BOLD}${GREEN}Phase ${data.completedPhase} 完成${NC}`);
      console.log('─────────────────────────────────────────────────────────');
      if (data.completed) {
        console.log(`${BOLD}${GREEN}🎉 流程全部完成！${NC}`);
        if (data.stateCleanedUp) {
          console.log(`${BOLD}状态文件:${NC} ${STATE_FILE} 已自动清理`);
        }
      } else {
        console.log(`${BOLD}下一阶段:${NC} Phase ${data.nextPhase}`);
      }
      const progressBar1 = renderProgressBar(data.progress);
      console.log(`${BOLD}进度:${NC} ${progressBar1} ${data.progress}%`);
      console.log('');
      break;

    case 'status': {
      console.log(`\n${BOLD}${CYAN}流程状态概览${NC}`);
      console.log('─────────────────────────────────────────────────────────');
      console.log(`${BOLD}场景:${NC}     ${MAGENTA}${data.scenario}${NC}`);
      if (data.completed) {
        console.log(`${BOLD}状态:${NC}     ${GREEN}${BOLD}已完成${NC}`);
      } else {
        console.log(`${BOLD}当前阶段:${NC} Phase ${data.currentPhase} (${data.currentPhaseName})`);
      }
      const progressBar = renderProgressBar(data.progress);
      console.log(`${BOLD}进度:${NC}     ${progressBar} ${data.completedCount}/${data.totalPhases} (${data.progress}%)`);
      console.log('');
      console.log(`${BOLD}Phases:${NC}`);
      for (const phase of config.WORKFLOW) {
        const pid = phase.phase;
        let icon, statusText;
        if (data.completedPhases.includes(pid)) {
          icon = `${GREEN}✓${NC}`;
          statusText = `${GREEN}已完成${NC}`;
        } else if (data.autoSkippedPhases.includes(pid)) {
          icon = `${YELLOW}⊘${NC}`;
          statusText = `${YELLOW}自动跳过${NC}`;
        } else if (data.manualSkippedPhases.includes(pid)) {
          icon = `${MAGENTA}⊘${NC}`;
          statusText = `${MAGENTA}手动跳过${NC}`;
        } else if (pid === data.currentPhase && !data.completed) {
          icon = `${CYAN}▶${NC}`;
          statusText = `${CYAN}${BOLD}进行中${NC}`;
        } else {
          icon = ' ';
          statusText = '待执行';
        }
        console.log(`  ${icon} Phase ${pid}: ${phase.name} - ${statusText}`);
      }
      console.log('');
      break;
    }

    case 'rollback':
      console.log(`\n${BOLD}${YELLOW}已回退到 Phase ${data.rolledBackTo}${NC}`);
      console.log('─────────────────────────────────────────────────────────');
      console.log(`${BOLD}当前阶段:${NC} Phase ${data.currentPhase}`);
      console.log(`${BOLD}已完成:${NC}   ${data.completedPhases.length > 0 ? data.completedPhases.map(p => `Phase ${p}`).join(', ') : '无'}`);
      console.log('');
      break;

    case 'gates':
      if (data.completed) {
        console.log(`\n${BOLD}${GREEN}流程已完成！${NC}\n`);
        break;
      }
      console.log(`\n${BOLD}${CYAN}Phase ${data.phaseId} (${data.phaseName}) 门控项${NC}`);
      console.log('─────────────────────────────────────────────────────────');
      if (data.gates.length === 0) {
        console.log(`  ${YELLOW}此阶段无硬门控${NC}`);
      } else {
        for (let i = 0; i < data.gates.length; i++) {
          const gate = data.gates[i];
          const result = data.gateResults[i];
          const statusIcon = result.passed ? `${GREEN}✓${NC}` : `${RED}✗${NC}`;
          console.log(`\n  ${BOLD}[${gate.type}]${NC} ${statusIcon} ${gate.description}`);
          console.log(`    ${BOLD}检查:${NC} ${gate.check}`);
          console.log(`    ${BOLD}失败建议:${NC} ${gate.failureSuggestion}`);
          if (!result.passed && result.reason) {
            console.log(`    ${BOLD}${RED}原因:${NC} ${result.reason.split('\n')[0]}`);
          }
        }
      }
      console.log('');
      break;

    case 'skip':
      console.log(`\n${BOLD}${MAGENTA}Phase ${data.skippedPhase} 已跳过${NC}`);
      console.log('─────────────────────────────────────────────────────────');
      console.log(`${BOLD}理由:${NC} ${data.reason}`);
      if (data.completed) {
        console.log(`${BOLD}${GREEN}🎉 流程全部完成！${NC}`);
        if (data.stateCleanedUp) {
          console.log(`${BOLD}状态文件:${NC} ${STATE_FILE} 已自动清理`);
        }
      } else {
        console.log(`${BOLD}当前阶段:${NC} Phase ${data.currentPhase}`);
      }
      const progressBar2 = renderProgressBar(data.progress);
      console.log(`${BOLD}进度:${NC} ${progressBar2} ${data.progress}%`);
      console.log('');
      break;

    case 'cleanup':
      console.log(`\n${BOLD}${CYAN}${data.message}${NC}`);
      console.log('─────────────────────────────────────────────────────────');
      console.log(`${BOLD}目标目录:${NC} ${skillPath}`);
      console.log('');
      break;
  }
}

function showHelp(config) {
  const title = config.META ? config.META.name : '流程控制器';
  const normalizedScenarios = normalizeScenarios(config.SCENARIOS || {});
  const scenarioKeys = Object.keys(normalizedScenarios);

  console.log(`\n${BOLD}${CYAN}${title} 有状态流程控制器${NC}`);
  console.log('─────────────────────────────────────────────────────────');
  console.log('');
  console.log(`${BOLD}用法:${NC}`);
  console.log(`  node <script> ${YELLOW}<path>${NC} ${GREEN}<command>${NC} ${CYAN}[options]${NC}`);
  console.log('');
  console.log(`${BOLD}参数:${NC}`);
  console.log(`  ${YELLOW}<path>${NC}               目标目录路径（默认: "."）`);
  console.log(`  ${GREEN}<command>${NC}             子命令`);
  console.log(`  ${CYAN}--pretty${NC}             人类可读格式输出（默认: JSON）`);
  console.log(`  ${CYAN}--help, -h${NC}           显示此帮助信息`);
  console.log('');
  console.log(`${BOLD}命令:${NC}`);
  console.log(`  ${GREEN}init${NC} ${MAGENTA}--scenario <name>${NC}   初始化流程（${scenarioKeys.join('/')}）`);
  console.log(`  ${GREEN}next${NC}                            获取当前阶段指引`);
  console.log(`  ${GREEN}complete${NC} ${YELLOW}<phaseId>${NC} ${MAGENTA}[--note <备注>]${NC}  完成当前阶段`);
  console.log(`  ${GREEN}status${NC}                          查看流程概览`);
  console.log(`  ${GREEN}rollback${NC} ${YELLOW}<phaseId>${NC}              回退到指定阶段`);
  console.log(`  ${GREEN}gates${NC} ${YELLOW}[phaseId]${NC}                查看门控状态（指定phaseId或当前阶段）`);
  console.log(`  ${GREEN}skip${NC} ${YELLOW}<phaseId>${NC} ${MAGENTA}--reason <理由>${NC}  手动跳过阶段`);
  console.log(`  ${GREEN}cleanup${NC}                          清理运行时状态文件 ${STATE_FILE}（流程完成时已自动清理，此命令用于历史遗留）`);
  console.log('');
  console.log(`${BOLD}退出码:${NC}`);
  console.log(`  ${GREEN}0${NC} = 成功`);
  console.log(`  ${RED}1${NC} = 错误（参数错误/门控失败/状态错误）`);
  console.log(`  ${YELLOW}2${NC} = 已完成（next 命令无下一步）`);
  console.log('');
}

function run(config, argv) {
  const args = parseEngineArgs(argv);

  if (args.help || !args.command) {
    showHelp(config);
    process.exit(args.help ? 0 : 1);
  }

  const targetPath = path.resolve(args.target);

  if (!fs.existsSync(targetPath) || !fs.statSync(targetPath).isDirectory()) {
    const err = { command: args.command, success: false, error: `目录不存在: ${targetPath}` };
    console.log(JSON.stringify(err, null, 2));
    process.exit(1);
  }

  let result;
  let exitCode = 0;

  try {
    switch (args.command) {
      case 'init':
        result = cmdInit(args, targetPath, config);
        break;
      case 'next':
        result = cmdNext(args, targetPath, config);
        break;
      case 'complete':
        result = cmdComplete(args, targetPath, config);
        break;
      case 'status':
        result = cmdStatus(args, targetPath, config);
        break;
      case 'rollback':
        result = cmdRollback(args, targetPath, config);
        break;
      case 'gates':
        result = cmdGates(args, targetPath, config);
        break;
      case 'skip':
        result = cmdSkip(args, targetPath, config);
        break;
      case 'cleanup':
        result = cmdCleanup(args, targetPath);
        break;
      default:
        showHelp(config);
        process.exit(1);
    }
  } catch (e) {
    result = { success: false, error: `执行出错: ${e.message}` };
    exitCode = 1;
  }

  if (result.exitCode !== undefined) {
    exitCode = result.exitCode;
    delete result.exitCode;
  }

  const output = { command: args.command, ...result };

  if (args.pretty) {
    printPretty(output, args.command, targetPath, config);
  } else {
    console.log(JSON.stringify(output, null, 2));
  }

  process.exit(exitCode);
}

module.exports = { run };
