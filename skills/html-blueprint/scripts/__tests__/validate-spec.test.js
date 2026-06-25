import { describe, it, expect } from 'vitest'
import { spawnSync } from 'child_process'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { validateSpec } from '../validate-spec.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SCRIPT_PATH = resolve(__dirname, '..', 'validate-spec.js')

function validSpec() {
  return {
    version: '1.0',
    page: { name: 'DashboardPage' },
    components: [
      {
        name: 'StatCard',
        convertMode: 'component',
        props: [
          { name: 'title', type: 'string', example: '本月销售额' },
          { name: 'value', type: 'number', example: 128000 },
        ],
        events: [
          { name: 'viewDetail', trigger: 'click' },
        ],
        states: [
          { name: 'default' },
          { name: 'loading', skeleton: true },
        ],
        dataSource: { type: 'api', endpoint: 'GET /api/stats' },
        visual: { layout: 'flex-column' },
      },
    ],
  }
}

describe('validate-spec', () => {
  it('passes a valid spec with no errors', () => {
    const { errors, warnings } = validateSpec(validSpec())
    expect(errors).toEqual([])
    expect(warnings).toEqual([])
  })

  it('flags missing version as HARD error', () => {
    const spec = validSpec()
    delete spec.version
    const { errors } = validateSpec(spec)
    expect(errors).toContainEqual(expect.objectContaining({
      level: 'HARD',
      rule: 'version-required',
      path: 'version',
    }))
  })

  it('flags non-PascalCase page.name as HARD error', () => {
    const spec = validSpec()
    spec.page.name = 'dashboardPage'
    const { errors } = validateSpec(spec)
    expect(errors).toContainEqual(expect.objectContaining({
      level: 'HARD',
      rule: 'page-name-pascal',
      path: 'page.name',
    }))
  })

  it('flags invalid convertMode as HARD error', () => {
    const spec = validSpec()
    spec.components[0].convertMode = 'auto'
    const { errors } = validateSpec(spec)
    expect(errors).toContainEqual(expect.objectContaining({
      level: 'HARD',
      rule: 'convert-mode-invalid',
      path: 'components[0].convertMode',
    }))
  })

  it('flags non-camelCase prop name as HARD error', () => {
    const spec = validSpec()
    spec.components[0].props[0].name = 'Title'
    const { errors } = validateSpec(spec)
    expect(errors).toContainEqual(expect.objectContaining({
      level: 'HARD',
      rule: 'prop-name-camel',
      path: 'components[0].props[0].name',
    }))
  })

  it('flags custom type without typeRef as HARD error', () => {
    const spec = validSpec()
    spec.components[0].props[0] = { name: 'trend', type: 'Trend' }
    const { errors } = validateSpec(spec)
    expect(errors).toContainEqual(expect.objectContaining({
      level: 'HARD',
      rule: 'prop-type-ref-required',
      path: 'components[0].props[0].typeRef',
    }))
  })

  it('flags duplicate component names as HARD error', () => {
    const spec = validSpec()
    spec.components.push({ ...spec.components[0] })
    const { errors } = validateSpec(spec)
    expect(errors).toContainEqual(expect.objectContaining({
      level: 'HARD',
      rule: 'component-name-duplicate',
      path: 'components[1].name',
    }))
  })

  it('warns when component mode has no prop or event', () => {
    const spec = validSpec()
    spec.components[0].props = []
    spec.components[0].events = []
    const { errors, warnings } = validateSpec(spec)
    expect(warnings).toContainEqual(expect.objectContaining({
      level: 'SHOULD',
      rule: 'component-no-prop-event',
    }))
    expect(errors).toEqual([])
  })

  it('warns when dataSource exists but no loading state', () => {
    const spec = validSpec()
    spec.components[0].states = [{ name: 'default' }]
    const { warnings } = validateSpec(spec)
    expect(warnings).toContainEqual(expect.objectContaining({
      level: 'SHOULD',
      rule: 'data-source-no-loading',
    }))
  })
})

describe('validate-spec CLI', () => {
  it('shows usage when no args provided', () => {
    const result = spawnSync('node', [SCRIPT_PATH], {
      encoding: 'utf-8',
      timeout: 10000,
    })
    expect(result.status).toBe(0)
    expect(result.stdout).toContain('Usage:')
    expect(result.stdout).toContain('JSON')
  })
})
