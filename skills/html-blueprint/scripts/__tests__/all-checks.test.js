import { describe, it, expect, afterAll } from 'vitest'
import { spawnSync } from 'child_process'
import { writeFileSync, mkdirSync, rmSync } from 'fs'
import { resolve, dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SCRIPTS_DIR = resolve(__dirname, '..')

function runScript(scriptName, html) {
  const tmpDir = join('/tmp', `html-blueprint-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
  mkdirSync(tmpDir, { recursive: true })
  const filePath = join(tmpDir, 'test.html')
  writeFileSync(filePath, html, 'utf-8')

  const result = spawnSync('node', [resolve(SCRIPTS_DIR, scriptName), filePath], {
    encoding: 'utf-8',
    timeout: 10000,
  })

  rmSync(tmpDir, { recursive: true, force: true })
  return { status: result.status, stdout: result.stdout || '', stderr: result.stderr || '' }
}

afterAll(() => {
  // Clean up any remaining temp dirs
  try { rmSync('/tmp/html-blueprint-test-*', { recursive: true, force: true }) } catch (_) {}
})

describe('check-data-component', () => {
  it('passes valid PascalCase component names', () => {
    const html = `<main data-page="TestPage"><article data-component="StatCard" data-convert="component"><span data-prop="title">Title</span></article></main>`
    const r = runScript('check-data-component.js', html)
    expect(r.status).toBe(0)
    expect(r.stdout).toContain('0 finding(s)')
  })

  it('flags lowercase component names', () => {
    const html = `<div data-component="card"></div>`
    const r = runScript('check-data-component.js', html)
    expect(r.status).toBe(1)
    expect(r.stdout).toContain('首字母小写')
    expect(r.stdout).toContain('泛名')
  })

  it('flags Chinese characters in component names', () => {
    const html = `<div data-component="组件A"></div>`
    const r = runScript('check-data-component.js', html)
    expect(r.status).toBe(1)
    expect(r.stdout).toContain('中文')
  })

  it('flags generic component names', () => {
    const html = `<div data-component="Button"></div>`
    const r = runScript('check-data-component.js', html)
    expect(r.status).toBe(1)
    expect(r.stdout).toContain('泛名')
  })

  it('flags missing data-convert inside data-list', () => {
    const html = `<ul data-list="projects" data-list-type="dynamic"><li data-component="ProjectItem">Item</li></ul>`
    const r = runScript('check-data-component.js', html)
    expect(r.status).toBe(1)
    expect(r.stdout).toContain('缺少 data-convert')
  })
})

describe('check-data-convert', () => {
  it('passes valid data-convert values', () => {
    const html = `<div data-component="Card" data-convert="component"></div><section data-convert="layout"></section><div data-convert="static"></div><div data-convert="decorative" aria-hidden="true"></div><div data-convert="manual"></div>`
    const r = runScript('check-data-convert.js', html)
    expect(r.status).toBe(0)
    expect(r.stdout).toContain('0 finding(s)')
  })

  it('flags invalid data-convert value', () => {
    const html = `<div data-convert="auto"></div>`
    const r = runScript('check-data-convert.js', html)
    expect(r.status).toBe(1)
    expect(r.stdout).toContain('无效')
  })

  it('flags component mode without data-component', () => {
    const html = `<div data-convert="component"></div>`
    const r = runScript('check-data-convert.js', html)
    expect(r.status).toBe(1)
    expect(r.stdout).toContain('缺少 data-component')
  })

  it('flags decorative without aria-hidden', () => {
    const html = `<div data-convert="decorative"></div>`
    const r = runScript('check-data-convert.js', html)
    expect(r.status).toBe(1)
    expect(r.stdout).toContain('aria-hidden')
  })
})

describe('check-charts-manual', () => {
  it('passes chart with data-convert="manual"', () => {
    const html = `<div data-chart="bar" data-convert="manual"></div>`
    const r = runScript('check-charts-manual.js', html)
    expect(r.status).toBe(0)
    expect(r.stdout).toContain('0 finding(s)')
  })

  it('flags chart without data-convert', () => {
    const html = `<div data-chart="bar"></div>`
    const r = runScript('check-charts-manual.js', html)
    expect(r.status).toBe(1)
    expect(r.stdout).toContain('缺少 data-convert="manual"')
  })

  it('flags chart with wrong data-convert', () => {
    const html = `<div data-chart="line" data-convert="component"></div>`
    const r = runScript('check-charts-manual.js', html)
    expect(r.status).toBe(1)
    expect(r.stdout).toContain('应为 "manual"')
  })

  it('flags chart children with data-prop', () => {
    const html = `<div data-chart="bar"><div data-prop="barValue">100</div></div>`
    const r = runScript('check-charts-manual.js', html)
    expect(r.status).toBe(1)
    expect(r.stdout).toContain('data-prop="barValue"')
  })
})

describe('check-form-model', () => {
  it('passes form with data-model and data-component', () => {
    const html = `<form data-component="UserForm" data-model="user"><input data-field="name" data-type="string" /><button data-event="submit">提交</button></form>`
    const r = runScript('check-form-model.js', html)
    expect(r.status).toBe(0)
    expect(r.stdout).toContain('0 finding(s)')
  })

  it('flags form without data-model', () => {
    const html = `<form><input placeholder="name" /></form>`
    const r = runScript('check-form-model.js', html)
    expect(r.status).toBe(1)
    expect(r.stdout).toContain('缺少 data-model')
  })

  it('flags input without data-field', () => {
    const html = `<form data-component="F" data-model="user"><input placeholder="name" /></form>`
    const r = runScript('check-form-model.js', html)
    expect(r.status).toBe(1)
    expect(r.stdout).toContain('缺少 data-field')
  })

  it('allows static input without data-field', () => {
    const html = `<form data-component="F" data-model="user"><input data-static="true" value="search" /></form>`
    const r = runScript('check-form-model.js', html)
    expect(r.status).toBe(0)
    expect(r.stdout).toContain('0 finding(s)')
  })

  it('flags submit button without data-event', () => {
    const html = `<form data-component="F" data-model="user"><button type="submit">提交</button></form>`
    const r = runScript('check-form-model.js', html)
    expect(r.status).toBe(1)
    expect(r.stdout).toContain('data-event="submit"')
  })
})

describe('check-decorative-aria', () => {
  it('passes decorative element with aria-hidden', () => {
    const html = `<div data-decorative="true" aria-hidden="true"></div>`
    const r = runScript('check-decorative-aria.js', html)
    expect(r.status).toBe(0)
    expect(r.stdout).toContain('0 finding(s)')
  })

  it('flags decorative element without aria-hidden', () => {
    const html = `<div data-decorative="true"></div>`
    const r = runScript('check-decorative-aria.js', html)
    expect(r.status).toBe(1)
    expect(r.stdout).toContain('缺少 aria-hidden="true"')
  })

  it('flags decorative element containing data-prop', () => {
    const html = `<div data-decorative="true" aria-hidden="true"><span data-prop="name">test</span></div>`
    const r = runScript('check-decorative-aria.js', html)
    expect(r.status).toBe(1)
    expect(r.stdout).toContain('data-prop')
  })
})

describe('check-class-names', () => {
  it('passes BEM class names', () => {
    const html = `<div class="stat-card stat-card__title stat-card--highlight"></div>`
    const r = runScript('check-class-names.js', html)
    expect(r.status).toBe(0)
    expect(r.stdout).toContain('0 finding(s)')
  })

  it('flags generic class names like box1', () => {
    const html = `<div class="box1 text2 left"></div>`
    const r = runScript('check-class-names.js', html)
    expect(r.status).toBe(1)
    expect(r.stdout).toContain('泛名')
  })
})

describe('check-forbidden-selectors', () => {
  it('passes clean CSS', () => {
    const html = `<style>.stat-card { padding: 16px; } .stat-card__title { font-size: 14px; }</style>`
    const r = runScript('check-forbidden-selectors.js', html)
    expect(r.status).toBe(0)
    expect(r.stdout).toContain('0 finding(s)')
  })

  it('flags !important', () => {
    const html = `<style>.card { color: red !important; }</style>`
    const r = runScript('check-forbidden-selectors.js', html)
    expect(r.status).toBe(1)
    expect(r.stdout).toContain('!important')
  })

  it('flags deep descendant selectors', () => {
    const html = `<style>div > div > span { color: red; }</style>`
    const r = runScript('check-forbidden-selectors.js', html)
    expect(r.status).toBe(1)
    expect(r.stdout).toContain('深度标签选择器')
  })

  it('flags nth-child without class prefix', () => {
    const html = `<style>tr:nth-child(2) { background: #eee; }</style>`
    const r = runScript('check-forbidden-selectors.js', html)
    expect(r.status).toBe(1)
    expect(r.stdout).toContain(':nth-child()')
  })
})

describe('check-responsive-viewport', () => {
  it('passes HTML with @viewport comment', () => {
    const html = `<!-- @viewport width:1440 height:900 --><div>content</div>`
    const r = runScript('check-responsive-viewport.js', html)
    expect(r.status).toBe(0)
    expect(r.stdout).toContain('0 finding(s)')
  })

  it('passes HTML with meta viewport', () => {
    const html = `<head><meta name="viewport" content="width=device-width"></head><div>content</div>`
    const r = runScript('check-responsive-viewport.js', html)
    expect(r.status).toBe(0)
    expect(r.stdout).toContain('0 finding(s)')
  })

  it('flags HTML without viewport declaration', () => {
    const html = `<div>no viewport</div>`
    const r = runScript('check-responsive-viewport.js', html)
    expect(r.status).toBe(1)
    expect(r.stdout).toContain('缺少 @viewport')
  })
})
