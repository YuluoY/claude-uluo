/**
 * grade.js — 批量评测 grading 脚本。
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const BASE = '/Users/huyongle/Desktop/workspace/skills/.skill-workspaces/html-blueprint/iteration-1'

function readOutputs(outDir) {
  const result = { content: '', files: [] }
  try {
    for (const entry of readdirSync(outDir)) {
      const p = join(outDir, entry)
      if (statSync(p).isFile()) {
        result.content += readFileSync(p, 'utf-8') + '\n'
        result.files.push(entry)
      }
    }
  } catch (_) {}
  return result
}

function check(assertion, content, files) {
  const { id } = assertion
  let passed = false
  let evidence = ''

  switch (id) {
    // Eval 1: Dashboard
    case 'has-data-page':
      passed = /data-page\s*=\s*"[^"]+"/i.test(content)
      evidence = passed ? 'found data-page attribute' : 'no data-page attribute'
      break
    case 'pascal-case-components': {
      const comps = [...content.matchAll(/data-component\s*=\s*"([^"]+)"/g)].map(m => m[1])
      const bad = comps.filter(c => /^[a-z]/.test(c) || /[^\w]/.test(c))
      passed = comps.length > 0 && bad.length === 0
      evidence = passed ? `all ${comps.length} components PascalCase` : `bad: ${bad.join(', ')}`
      break
    }
    case 'chart-is-manual':
      passed = /data-chart\s*=[^>]*data-convert\s*=\s*"manual"/s.test(content) ||
               /data-convert\s*=\s*"manual"[^>]*data-chart/s.test(content)
      evidence = passed ? 'chart has data-convert=manual' : 'chart missing manual'
      break
    case 'has-convert-annotation':
      passed = /data-convert\s*=\s*"/.test(content)
      evidence = passed ? 'has data-convert' : 'no data-convert'
      break
    case 'has-confidence-report':
      passed = /"confidence"|conversion-report|转换.*报告|置信度/.test(content)
      evidence = passed ? 'report found' : 'no report'
      break
    case 'no-generic-classes': {
      const bad = content.match(/\b(box\d+|text\d+)\b/gi) || []
      const positional = content.match(/class\s*=\s*"[^"]*\b(left|right)(?![a-zA-Z-])[^"]*"/gi) || []
      passed = bad.length === 0
      evidence = passed ? 'no generic class names' : `found: ${[...bad, ...positional].join(', ')}`
      break
    }
    case 'no-important':
      passed = !content.includes('!important')
      evidence = passed ? 'no !important' : 'contains !important'
      break

    // Eval 2: Form
    case 'form-has-data-model':
      passed = /<form[^>]*\sdata-model\s*=\s*"[^"]+"/i.test(content)
      evidence = passed ? 'has data-model' : 'no data-model'
      break
    case 'form-has-data-component':
      passed = /<form[^>]*\sdata-component\s*=\s*"[^"]+"/i.test(content)
      evidence = passed ? 'has data-component' : 'no data-component on form'
      break
    case 'fields-have-data-field': {
      const inputs = [...content.matchAll(/<input[^>]*>/gi)]
      const formInputs = inputs.filter(([m]) => !m.includes('data-static="true"') && !m.includes('type="submit"'))
      const missing = formInputs.filter(([m]) => !m.includes('data-field='))
      passed = formInputs.length > 0 && missing.length === 0
      evidence = passed ? `all ${formInputs.length} inputs have data-field` : `${missing.length}/${formInputs.length} missing data-field`
      break
    }
    case 'fields-have-data-type': {
      const inputs = [...content.matchAll(/<input[^>]*>/gi)]
      const formInputs = inputs.filter(([m]) => !m.includes('data-static="true"') && !m.includes('type="submit"'))
      const missing = formInputs.filter(([m]) => !m.includes('data-type='))
      passed = formInputs.length > 0 && missing.length === 0
      evidence = passed ? `all inputs have data-type` : `${missing.length}/${formInputs.length} missing data-type`
      break
    }
    case 'submit-has-data-event':
      passed = /<button[^>]*\sdata-event\s*=\s*"[^"]+"/i.test(content) || /<input[^>]*type="submit"[^>]*data-event/i.test(content)
      evidence = passed ? 'submit has data-event' : 'no data-event on submit'
      break
    case 'static-labels':
      passed = /data-static\s*=\s*"true"/.test(content)
      evidence = passed ? 'has data-static' : 'no data-static'
      break
    case 'no-missing-field': {
      const inputs = [...content.matchAll(/<input[^>]*>/gi)]
      const formInputs = inputs.filter(([m]) => !m.includes('data-static="true"') && !m.includes('type="submit"') && !m.includes('type="button"') && !m.includes('type="reset"'))
      const missing = formInputs.filter(([m]) => !m.includes('data-field='))
      passed = missing.length === 0
      evidence = passed ? 'no missing fields' : `${missing.length} missing data-field`
      break
    }

    // Eval 3: Review
    case 'flags-component-naming':
      passed = /(card|小写|PascalCase|泛名|lowercase)/i.test(content) && /data-component/i.test(content)
      evidence = passed ? 'identified naming issue' : 'did not flag naming'
      break
    case 'flags-chart-issues':
      passed = /chart.*(manual|data-convert|缺少|missing|标记)/i.test(content) &&
               /(data-prop|子元素|barValue)/i.test(content)
      evidence = passed ? 'identified chart issues' : 'did not flag chart issues'
      break
    case 'flags-form-issues':
      passed = /form.*(data-model|data-field|data-component|缺少)/i.test(content)
      evidence = passed ? 'identified form issues' : 'did not flag form issues'
      break
    case 'flags-css-antipatterns':
      passed = /(!important|深度|> \w+ >|\*:not)/.test(content)
      evidence = passed ? 'identified CSS anti-patterns' : 'did not flag CSS issues'
      break
    case 'flags-class-names':
      passed = /(box1|left|positional|generic|泛名|class.*命名)/i.test(content)
      evidence = passed ? 'identified class naming' : 'did not flag class names'
      break
    case 'prioritized-output':
      passed = /(HARD|SHOULD|WARN|阻断|严重|优先级|priority|Critical)/i.test(content)
      evidence = passed ? 'output has priority tiers' : 'no priority tiers'
      break
    case 'provides-fixes':
      passed = /(修复|fix|改为|应该|替换|修正|replace|\`\`\`html|\`\`\`css)/.test(content)
      evidence = passed ? 'provides fix code' : 'no fix code'
      break

    default:
      evidence = 'unknown assertion'
  }

  return { text: assertion.text, passed, evidence }
}

const EVALS = ['eval-1-dashboard', 'eval-2-form', 'eval-3-review']
let totalPassed = 0
let totalChecks = 0

for (const evDir of EVALS) {
  const meta = JSON.parse(readFileSync(join(BASE, evDir, 'eval_metadata.json'), 'utf-8'))

  for (const variant of ['with_skill', 'without_skill']) {
    const outDir = join(BASE, evDir, variant, 'outputs')
    const { content, files } = readOutputs(outDir)
    const results = meta.assertions.map(a => check(a, content, files))
    const grading = { expectations: results }
    writeFileSync(join(BASE, evDir, variant, 'grading.json'), JSON.stringify(grading, null, 2), 'utf-8')

    const passed = results.filter(r => r.passed).length
    totalPassed += passed
    totalChecks += results.length
    console.log(`${evDir}/${variant}: ${passed}/${results.length} passed`)
    for (const r of results) {
      console.log(`  ${r.passed ? '✓' : '✗'} ${r.text.slice(0, 50)} — ${r.evidence.slice(0, 60)}`)
    }
  }
}

console.log(`\nTotal: ${totalPassed}/${totalChecks} passed`)
