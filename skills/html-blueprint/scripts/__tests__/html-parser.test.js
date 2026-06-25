import { describe, it, expect } from 'vitest'
import { parseHTML } from '../lib/html-parser.js'

describe('html-parser — 自闭合标签', () => {
  it('自闭合语法的 data-prop 属性可被读取', () => {
    const $ = parseHTML(`<input data-prop="name" data-type="string" />`)
    const el = $('[data-prop]').first()
    expect(el.length).toBe(1)
    expect(el.attr('data-prop')).toBe('name')
    expect(el.attr('data-type')).toBe('string')
  })

  it('不把自闭合斜杠当作属性', () => {
    const $ = parseHTML(`<input data-prop="name" />`)
    const el = $('[data-prop]').first()
    expect(el.attr('/')).toBeNull()
  })

  it('void 元素不带斜杠也能读取属性', () => {
    const $ = parseHTML(`<input data-prop="age" data-type="number">`)
    const el = $('[data-prop]').first()
    expect(el.attr('data-prop')).toBe('age')
  })
})

describe('html-parser — 属性值中的 > 字符', () => {
  it('双引号属性值包含 > 时正确解析', () => {
    const $ = parseHTML(`<div title="a > b">x</div>`)
    expect($('div').first().attr('title')).toBe('a > b')
  })

  it('单引号属性值包含 > 时正确解析', () => {
    const $ = parseHTML(`<div title='a > b'>x</div>`)
    expect($('div').first().attr('title')).toBe('a > b')
  })

  it('属性值包含多个 > 时正确解析', () => {
    const $ = parseHTML(`<div data-expr="a > b > c">x</div>`)
    expect($('div').first().attr('data-expr')).toBe('a > b > c')
  })
})

describe('html-parser — HTML 实体解码', () => {
  it('text() 解码 &gt; &lt; &amp;', () => {
    const $ = parseHTML(`<p>价格 &gt; 100 &amp; 数量 &lt; 50</p>`)
    for (const el of $('p')) {
      expect(el.text()).toBe('价格 > 100 & 数量 < 50')
    }
  })

  it('text() 解码 &quot; &#39; &nbsp;', () => {
    const $ = parseHTML(`<p>say &quot;hi&quot; it&#39;s &nbsp;ok</p>`)
    for (const el of $('p')) {
      expect(el.text()).toBe('say "hi" it\'s  ok')
    }
  })

  it('不解码标签内的实体（避免误删）', () => {
    const $ = parseHTML(`<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>`)
    for (const el of $('p')) {
      expect(el.text()).toBe('<script>alert(1)</script>')
    }
  })
})

describe('html-parser — 注释处理', () => {
  it('简单注释不产生元素节点', () => {
    const $ = parseHTML(`<!-- @viewport width:1440 --><div>x</div>`)
    expect($('div').length).toBe(1)
  })

  it('注释内含标签样文本时不产生元素', () => {
    const $ = parseHTML(`<!-- <div data-foo="bad"> --><div data-foo="good">x</div>`)
    expect($('[data-foo]').length).toBe(1)
    expect($('[data-foo]').first().attr('data-foo')).toBe('good')
  })

  it('注释不影响后续元素的 innerHTML', () => {
    const $ = parseHTML(`<div><!-- comment -->text</div>`)
    for (const el of $('div')) {
      expect(el.text()).toBe('text')
    }
  })
})

describe('html-parser — 嵌套组件', () => {
  it('嵌套 3 层组件正确解析（无双重嵌套）', () => {
    const html = `<main data-page="P">
      <section data-component="Outer" data-convert="component">
        <article data-component="Middle" data-convert="component">
          <span data-component="Inner" data-convert="component">deep</span>
        </article>
      </section>
    </main>`
    const $ = parseHTML(html)
    const comps = $('[data-component]')
    expect(comps.length).toBe(3)
    const names = []
    comps.each((_, el) => names.push(el.attr('data-component')))
    expect(names).toEqual(['Outer', 'Middle', 'Inner'])
  })
})
