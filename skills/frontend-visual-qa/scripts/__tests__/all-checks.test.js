/**
 * Comprehensive tests for all hard-constraint validation scripts.
 * Each test creates isolated fixture files and tests against
 * individual files (not shared directories) to prevent cross-test contamination.
 */
import { describe, it, expect, afterAll } from 'vitest'
import { spawnSync } from 'child_process'
import { mkdtempSync, writeFileSync, rmSync, existsSync } from 'fs'
import { join, resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SCRIPTS_DIR = resolve(__dirname, '..')

let dirsToCleanup = []

function tempDir() {
  const d = mkdtempSync('/tmp/fui-')
  dirsToCleanup.push(d)
  return d
}

function file(name, content) {
  const d = tempDir()
  const p = join(d, name)
  writeFileSync(p, content)
  return p
}

afterAll(() => {
  for (const d of dirsToCleanup) {
    if (existsSync(d)) rmSync(d, { recursive: true })
  }
})

function run(script, args = []) {
  return spawnSync('node', [join(SCRIPTS_DIR, script), ...args], {
    encoding: 'utf-8',
    timeout: 10000,
  })
}

// ═══════════════════════════════════════════
// check-emojis.js
// ═══════════════════════════════════════════

describe('check-emojis.js', () => {
  it('detects emoji in JSX text content', () => {
    const f = file('Badge.jsx', 'export default () => <span>🔥 VIP</span>')
    const r = run('check-emojis.js', [f])
    expect(r.status).toBe(1)
    expect(r.stdout).toContain('🔥')
  })

  it('detects emoji in .vue template', () => {
    const f = file('IconBadge.vue', '<template><span>🔥 Hot</span></template>')
    const r = run('check-emojis.js', [f])
    expect(r.status).toBe(1)
  })

  it('detects emoji in .html content', () => {
    const f = file('page.html', '<h1>🎉 Welcome</h1>')
    const r = run('check-emojis.js', [f])
    expect(r.status).toBe(1)
  })

  it('skips .test. files', () => {
    const f = file('Icon.test.tsx', 'export default () => <span>🔥</span>')
    const r = run('check-emojis.js', [f])
    expect(r.status).toBe(0)
    expect(r.stdout).toContain('SKIPPED')
  })

  it('skips __tests__ directories', () => {
    const d = tempDir()
    const sub = join(d, '__tests__')
    const { mkdirSync } = require('fs')
    mkdirSync(sub)
    writeFileSync(join(sub, 'test.jsx'), 'export default () => <span>🔥</span>')
    const r = run('check-emojis.js', [d])
    expect(r.status).toBe(0)
  })

  it('skips emoji in const string assignments', () => {
    const f = file('consts.ts', `const label = '🔥 hot'`)
    const r = run('check-emojis.js', [f])
    expect(r.status).toBe(0)
  })

  it('skips emoji in i18n/t() calls', () => {
    const f = file('i18n.ts', `const msg = t('emoji_🔥_icon')`)
    const r = run('check-emojis.js', [f])
    expect(r.status).toBe(0)
  })

  it('skips comment lines with emoji', () => {
    const f = file('comments.tsx', '// this is a 🔥 comment\nexport const x = 1')
    const r = run('check-emojis.js', [f])
    expect(r.status).toBe(0)
  })

  it('reports 0 findings for clean files', () => {
    const f = file('clean.tsx', 'export default () => <span>Normal text</span>')
    const r = run('check-emojis.js', [f])
    expect(r.status).toBe(0)
    expect(r.stdout).toContain('0 finding')
  })

  it('handles no-input case', () => {
    const r = run('check-emojis.js', [])
    expect(r.status).toBe(0)
    expect(r.stdout).toContain('Usage')
  })
})

// ═══════════════════════════════════════════
// check-hardcoded-colors.js
// ═══════════════════════════════════════════

describe('check-hardcoded-colors.js', () => {
  it('detects hex color in inline style', () => {
    const f = file('bad.html', '<button style="background: #ff6600">Submit</button>')
    const r = run('check-hardcoded-colors.js', [f])
    expect(r.status).toBe(1)
    expect(r.stdout).toContain('#ff6600')
  })

  it('detects hex color in SCSS', () => {
    const f = file('bad.scss', '.btn { color: #333333; }')
    const r = run('check-hardcoded-colors.js', [f])
    expect(r.status).toBe(1)
  })

  it('detects rgb() values', () => {
    const f = file('rgb.scss', '.box { background: rgb(255, 0, 0); }')
    const r = run('check-hardcoded-colors.js', [f])
    expect(r.status).toBe(1)
  })

  it('detects rgba() values', () => {
    const f = file('rgba.scss', '.box { background: rgba(0,0,0,0.5); }')
    const r = run('check-hardcoded-colors.js', [f])
    expect(r.status).toBe(1)
  })

  it('skips token definition files (tokens.css)', () => {
    const f = file('tokens.css', ':root { --primary: #2563EB; }')
    const r = run('check-hardcoded-colors.js', [f])
    expect(r.status).toBe(0)
  })

  it('skips variables.scss', () => {
    const f = file('_variables.scss', '$primary: #2563EB;')
    const r = run('check-hardcoded-colors.js', [f])
    expect(r.status).toBe(0)
  })

  it('skips theme-related files', () => {
    const f = file('theme.ts', 'export const theme = { primary: "#2563EB" }')
    const r = run('check-hardcoded-colors.js', [f])
    // theme.ts should be detected as a token file
    expect(r.status).toBe(0)
  })

  it('skips files using var(--...)', () => {
    const f = file('with-token.scss', '.btn { color: var(--primary); }')
    const r = run('check-hardcoded-colors.js', [f])
    expect(r.status).toBe(0)
  })

  it('skips comment lines', () => {
    const f = file('comment.scss', '// color: #ff0000;\n.btn { color: var(--primary); }')
    const r = run('check-hardcoded-colors.js', [f])
    expect(r.status).toBe(0)
  })

  it('skips data string lines (const assignments)', () => {
    const f = file('data.ts', `const COLOR = '#ff0000'`)
    const r = run('check-hardcoded-colors.js', [f])
    expect(r.status).toBe(0)
  })

  it('handles no-input case', () => {
    const r = run('check-hardcoded-colors.js', [])
    expect(r.status).toBe(0)
    expect(r.stdout).toContain('Usage')
  })
})

// ═══════════════════════════════════════════
// check-missing-states.js
// ═══════════════════════════════════════════

describe('check-missing-states.js', () => {
  it('flags component with useQuery but no loading/error/empty', () => {
    const f = file('UserList.tsx', `
      import { useQuery } from '@tanstack/react-query'
      export default function UserList() {
        const { data } = useQuery({ queryKey: ['users'], queryFn: fetchUsers })
        return <ul>{data?.map(u => <li>{u.name}</li>)}</ul>
      }
    `)
    const r = run('check-missing-states.js', [f])
    expect(r.status).toBe(1)
    expect(r.stdout).toContain('缺少')
  })

  it('passes component with loading + error + empty', () => {
    const f = file('GoodList.tsx', `
      import { useQuery } from '@tanstack/react-query'
      export default function GoodList() {
        const { data, isLoading, isError } = useQuery({ queryKey: ['x'] })
        if (isLoading) return <Spinner />
        if (isError) return <ErrorPage />
        if (!data?.length) return <Empty />
        return <ul>{data.map(x => <li>{x}</li>)}</ul>
      }
    `)
    const r = run('check-missing-states.js', [f])
    expect(r.status).toBe(0)
  })

  it('flags component using fetch without error/loading', () => {
    const f = file('FetchComp.tsx', `
      import { useState, useEffect } from 'react'
      export default function FetchComp() {
        const [data, setData] = useState(null)
        useEffect(() => { fetch('/api/data').then(r => r.json()).then(setData) }, [])
        return <div>{data}</div>
      }
    `)
    const r = run('check-missing-states.js', [f])
    expect(r.status).toBe(1)
  })

  it('flags component with axios without states', () => {
    const f = file('AxiosComp.vue', `
      <script setup>
      import axios from 'axios'
      import { ref } from 'vue'
      const data = ref(null)
      axios.get('/api/items').then(r => data.value = r.data)
      </script>
      <template><div>{{ data }}</div></template>
    `)
    const r = run('check-missing-states.js', [f])
    expect(r.status).toBe(1)
  })

  it('skips /hooks/ path files', () => {
    const f = file('useData.ts', `
      import { useQuery } from '@tanstack/react-query'
      export function useData() { return useQuery({ queryKey: ['x'] }) }
    `)
    // Put it in a path that contains /hooks/
    const d = tempDir()
    const { mkdirSync } = require('fs')
    mkdirSync(join(d, 'hooks'), { recursive: true })
    writeFileSync(join(d, 'hooks/useData.ts'), 'import { useQuery } from "@tanstack/react-query"\nexport function useData() { return useQuery({ queryKey: ["x"] }) }')
    const r = run('check-missing-states.js', [d])
    expect(r.status).toBe(0)
  })

  it('skips /api/ path files', () => {
    const d = tempDir()
    const { mkdirSync } = require('fs')
    mkdirSync(join(d, 'api'), { recursive: true })
    writeFileSync(join(d, 'api/client.ts'), "import axios from 'axios'\nexport const api = axios.create({})")
    const r = run('check-missing-states.js', [d])
    expect(r.status).toBe(0)
  })

  it('does not flag files without data fetching', () => {
    const f = file('PureComp.tsx', 'export default function PureComp() { return <div>Hello</div> }')
    const r = run('check-missing-states.js', [f])
    expect(r.status).toBe(0)
  })

  it('handles no-input case', () => {
    const r = run('check-missing-states.js', [])
    expect(r.status).toBe(0)
    expect(r.stdout).toContain('Usage')
  })
})

// ═══════════════════════════════════════════
// check-tailwind.js
// ═══════════════════════════════════════════

describe('check-tailwind.js', () => {
  it('detects Tailwind utility classes in className', () => {
    const f = file('tw.tsx', '<div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-zinc-950 rounded-lg" />')
    const r = run('check-tailwind.js', [f])
    expect(r.status).toBe(1)
    expect(r.stdout).toContain('Tailwind')
  })

  it('detects @tailwind directive', () => {
    const f = file('tw.css', '@tailwind base;\n@tailwind components;\n@tailwind utilities;')
    const r = run('check-tailwind.js', [f])
    expect(r.status).toBe(1)
    expect(r.stdout).toContain('Tailwind 指令')
  })

  it('detects @apply directive', () => {
    const f = file('apply.css', '.btn { @apply px-4 py-2 rounded; }')
    const r = run('check-tailwind.js', [f])
    expect(r.status).toBe(1)
  })

  it('skips when tailwind.config.js exists', () => {
    const d = tempDir()
    writeFileSync(join(d, 'tailwind.config.js'), 'module.exports = { content: [] }')
    writeFileSync(join(d, 'tw-component.tsx'), '<div className="flex items-center justify-between px-4" />')
    const r = run('check-tailwind.js', [d])
    expect(r.status).toBe(0)
  })

  it('does not flag fewer than 3 Tailwind-like classes', () => {
    const f = file('few-tw.tsx', '<div className="flex gap-2" />')
    const r = run('check-tailwind.js', [f])
    expect(r.status).toBe(0)
  })

  it('handles no-input case', () => {
    const r = run('check-tailwind.js', [])
    expect(r.status).toBe(0)
    expect(r.stdout).toContain('Usage')
  })
})

// ═══════════════════════════════════════════
// check-responsive.js
// ═══════════════════════════════════════════

describe('check-responsive.js', () => {
  it('detects fixed width > 100px', () => {
    const f = file('fixed.scss', '.sidebar { width: 480px; }')
    const r = run('check-responsive.js', [f])
    expect(r.status).toBe(1)
    expect(r.stdout).toContain('480px')
  })

  it('detects fixed height > 100px', () => {
    const f = file('fixed-h.scss', '.hero { height: 600px; }')
    const r = run('check-responsive.js', [f])
    expect(r.status).toBe(1)
    expect(r.stdout).toContain('600px')
  })

  it('detects small max-width that risks mobile overflow', () => {
    const f = file('small-max.scss', '.box { max-width: 280px; }')
    const r = run('check-responsive.js', [f])
    expect(r.status).toBe(1)
    expect(r.stdout).toContain('280px')
  })

  it('detects viewport font sizes', () => {
    const f = file('vw-font.scss', 'h1 { font-size: 4vw; }')
    const r = run('check-responsive.js', [f])
    expect(r.status).toBe(1)
  })

  it('flags large style file without responsive patterns', () => {
    let css = ''
    for (let i = 0; i < 60; i++) css += `.c${i} { color: #333; }\n`
    const f = file('no-resp.css', css)
    const r = run('check-responsive.js', [f])
    expect(r.status).toBe(1)
    expect(r.stdout).toContain('缺少响应式断点')
  })

  it('does not flag small style files without responsive patterns', () => {
    const f = file('small.css', '.btn { color: #333; }')
    const r = run('check-responsive.js', [f])
    expect(r.status).toBe(0)
  })

  it('handles no-input case', () => {
    const r = run('check-responsive.js', [])
    expect(r.status).toBe(0)
    expect(r.stdout).toContain('Usage')
  })
})

// ═══════════════════════════════════════════
// validate-all.js (orchestrator)
// ═══════════════════════════════════════════

describe('validate-all.js', () => {
  it('aggregates findings from all checks', () => {
    const f = file('combined.tsx', `
      export default function Bad() {
        return <div style={{ background: '#ff0000' }}>🔥 Hot</div>
      }
    `)
    const r = run('validate-all.js', [f])
    expect(r.status).toBe(1)
    expect(r.stdout).toContain('emoji 图标检测')
    expect(r.stdout).toContain('硬编码颜色检测')
    expect(r.stdout).toContain('总计')
  })

  it('--json flag produces valid JSON', () => {
    const f = file('json.tsx', 'export default () => <span>🔥</span>')
    const r = run('validate-all.js', ['--json', f])
    expect(r.status).toBe(1)
    const json = JSON.parse(r.stdout)
    expect(json).toHaveProperty('totalFindings')
    expect(json).toHaveProperty('checks')
    expect(json.checks.length).toBeGreaterThanOrEqual(5)
    expect(json.totalFindings).toBeGreaterThan(0)
  })

  it('prints help with no args', () => {
    const r = run('validate-all.js', [])
    expect(r.status).toBe(0)
    expect(r.stdout).toContain('Usage')
  })

  it('reports 0 findings for clean file', () => {
    const d = tempDir()
    writeFileSync(join(d, 'Clean.tsx'), 'export default () => <div>Hello World</div>')
    writeFileSync(join(d, 'tailwind.config.js'), 'module.exports = {}')
    const r = run('validate-all.js', [d])
    expect(r.stdout).toContain('0 个发现')
  })
})
