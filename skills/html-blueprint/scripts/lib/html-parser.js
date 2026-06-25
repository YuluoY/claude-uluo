/**
 * html-parser.js — 零依赖轻量 HTML 解析器。
 *
 * 提供 cheerio 子集：按属性选择元素、遍历、取属性值、祖先查找、子元素查找。
 * 处理自闭合标签属性、属性值中的 > 字符、基本 HTML 实体解码、注释跳过。
 * 不处理闭合修复——假设输入是合理的 html-blueprint 设计稿。
 *
 * 用法：
 *   import { parseHTML } from './lib/html-parser.js'
 *   const $ = parseHTML(htmlString)
 *   $('[data-component]').each(el => { ... })
 */

/**
 * 解析 HTML 字符串，返回类 jQuery 的查询对象。
 * @param {string} html
 * @returns {DomQuery}
 */
export function parseHTML(html) {
  const root = buildTree(html)
  const allNodes = flatten(root)

  /**
   * 可调用的选择器函数：$(selector) → NodeList
   */
  function $(selector) {
    const dq = new DomQuery(allNodes, root)
    return dq.$(selector)
  }

  // 直接附加 DomQuery 的方法
  $.html = (el) => cloneHTML(el)
  $.text = (el) => el.text()

  return $
}

/**
 * 构建 DOM 树。
 */
function buildTree(html) {
  // 去除注释：用等长空格替换，保留索引以便 innerHTML 切片仍正确
  html = html.replace(/<!--[\s\S]*?-->/g, (m) => ' '.repeat(m.length))

  const root = { tag: '#root', attrs: {}, children: [], parent: null, innerHTML: '', start: 0, end: html.length }
  const stack = [root]

  // 匹配开标签、自闭合标签、闭标签。属性值用引号包裹时允许包含 >
  const tagRe = /<\/?(\w+)((?:[^>"']|"[^"]*"|'[^']*')*)>/g
  let match
  let lastIndex = 0

  while ((match = tagRe.exec(html)) !== null) {
    const fullMatch = match[0]
    const tagName = match[1].toLowerCase()
    const attrsStr = match[2]
    const isClose = fullMatch.startsWith('</')
    const isSelfClose = fullMatch.endsWith('/>')

    if (isClose) {
      // 闭合标签：弹出栈
      if (stack.length > 1 && stack[stack.length - 1].tag === tagName) {
        const closed = stack.pop()
        closed.end = match.index + fullMatch.length
        closed.innerHTML = html.slice(closed.openTagEnd, match.index)
      }
    } else {
      // 开标签
      const node = {
        tag: tagName,
        attrs: parseAttrs(attrsStr),
        children: [],
        parent: stack[stack.length - 1],
        start: match.index,
        openTagEnd: match.index + fullMatch.length,
        end: 0,
        innerHTML: '',
      }

      stack[stack.length - 1].children.push(node)

      if (!isSelfClose && !isVoid(tagName)) {
        stack.push(node)
      } else {
        // 自闭合或 void 元素
        node.end = match.index + fullMatch.length
        node.innerHTML = ''
      }
    }
    lastIndex = match.index
  }

  // 剩余未闭合的标签强制出栈
  while (stack.length > 1) {
    const node = stack.pop()
    node.end = html.length
    node.innerHTML = html.slice(node.openTagEnd, node.end)
  }

  return root
}

/**
 * 扁平化树为数组，供属性选择器查询。
 */
function flatten(node) {
  const result = []
  if (node.tag !== '#root') result.push(node)
  for (const child of node.children) {
    result.push(...flatten(child))
  }
  return result
}

/**
 * 解析属性字符串 "key="val" key2="val2" key3"。
 */
function parseAttrs(attrsStr) {
  const attrs = {}
  // 去除自闭合标签尾部的 /（如 <input ... /> 中的 /）
  const cleaned = attrsStr.replace(/\/\s*$/, '')
  const re = /(\S+?)\s*=\s*(?:"([^"]*)"|'([^']*)')|(\S+)/g
  let m
  while ((m = re.exec(cleaned)) !== null) {
    if (m[1]) {
      const key = m[1].toLowerCase().trim()
      if (m[2] !== undefined) {
        attrs[key] = m[2]
      } else if (m[3] !== undefined) {
        attrs[key] = m[3]
      }
    } else if (m[4]) {
      const key = m[4].toLowerCase().trim()
      if (key && key !== '/') attrs[key] = ''
    }
  }
  return attrs
}

/**
 * void 元素列表。
 */
function isVoid(tag) {
  return ['input', 'img', 'br', 'hr', 'area', 'base', 'col', 'embed', 'link', 'meta', 'param', 'source', 'track', 'wbr'].includes(tag)
}

/**
 * 按标签+属性过滤节点。支持:
 *   tag              单个标签
 *   tag1,tag2        逗号分隔
 *   tag[attr]        标签+属性存在
 *   tag[attr="val"]  标签+属性等于
 *   tag:not([attr])  标签+属性不存在
 */
function filterByTagAndAttr(nodes, selector) {
  const s = selector.toLowerCase()
  const parts = s.split(',').map(t => t.trim())

  // 逗号分隔 → UNION of each part's results
  const allResults = new Set()
  for (const part of parts) {
    const forPart = filterSingleSelector(nodes, part)
    for (const n of forPart) allResults.add(n)
  }
  return [...allResults]
}

/**
 * 过滤单个选择器部分（不含逗号）。
 */
function filterSingleSelector(nodes, part) {
  let results = nodes

  // 提取标签名
  const bracketIdx = part.indexOf('[')
  const colonIdx = part.indexOf(':')
  const endIdx = bracketIdx > -1 ? bracketIdx : colonIdx > -1 ? colonIdx : part.length
  const tagName = part.slice(0, endIdx).trim()
  if (tagName) {
    results = results.filter(n => n.tag === tagName)
  }

  // 按属性过滤
  const attrMatches = part.match(/\[([^=\]]+)(?:="([^"]*)")?\]/g)
  const notMatch = part.match(/:not\(\[([^\]]+)\]\)/)
  if (notMatch) {
    const notAttr = notMatch[1].toLowerCase()
    results = results.filter(n => !(notAttr in n.attrs))
  } else if (attrMatches) {
    for (const am of attrMatches) {
      const inner = am.replace(/[\[\]]/g, '')
      const eqIdx = inner.indexOf('=')
      if (eqIdx > -1) {
        const a = inner.slice(0, eqIdx).toLowerCase()
        const v = inner.slice(eqIdx + 1).replace(/"/g, '')
        results = results.filter(n => n.attrs[a] === v)
      } else {
        results = results.filter(n => inner.toLowerCase() in n.attrs)
      }
    }
  }
  return results
}

// ─── DomQuery ───

class DomQuery {
  constructor(allNodes, root) {
    this._all = allNodes
    this._root = root
  }

  /**
   * 属性选择器查询。
   * 支持: '[attr]', '[attr="value"]', '[attr1],[attr2]', '[parent] [child]'
   */
  $(selector) {
    let nodes = this._all

    // 处理逗号分隔的多选择器
    if (selector.includes(',')) {
      const parts = selector.split(',').map(s => s.trim())
      const results = new Set()
      for (const part of parts) {
        for (const n of this._select(part)) results.add(n)
      }
      return new NodeList([...results])
    }

    // 处理空格分隔的父子选择器 '[parent] [child]'
    if (/\s/.test(selector.trim())) {
      const parts = selector.trim().split(/\s+/)
      let currentSet = new Set(this._select(parts[0]))
      for (let i = 1; i < parts.length; i++) {
        const nextSet = new Set()
        for (const parent of currentSet) {
          for (const child of this._selectIn(parts[i], parent)) {
            nextSet.add(child)
          }
        }
        currentSet = nextSet
      }
      return new NodeList([...currentSet])
    }

    return new NodeList(this._select(selector))
  }

  /**
   * 解析单个选择器。支持:
   *   [attr]        属性存在
   *   [attr="val"]  属性等于
   *   tag           标签名
   *   tag1,tag2     逗号分隔的标签名
   */
  _select(selector) {
    const s = selector.trim()
    // 属性选择器
    if (s.startsWith('[')) {
      let attr, value
      const eqIdx = s.indexOf('=')
      if (eqIdx > -1) {
        attr = s.slice(1, eqIdx).replace(/[\]\[]/g, '').toLowerCase()
        value = s.match(/="([^"]*)"/)?.[1] || ''
      } else {
        attr = s.replace(/[\]\[]/g, '').toLowerCase()
      }
      return this._all.filter(n => {
        if (value !== undefined && value !== '') return n.attrs[attr] === value
        return attr in n.attrs
      })
    }
    // 标签选择器 (支持逗号分隔和 tag[attr] 组合)
    return filterByTagAndAttr(this._all, s)
  }

  _selectIn(selector, parent) {
    const s = selector.trim()
    const descendents = parent.children.flatMap(c => flatten(c))
    if (s.startsWith('[')) {
      let attr, value
      const eqIdx = s.indexOf('=')
      if (eqIdx > -1) {
        attr = s.slice(1, eqIdx).replace(/[\]\[]/g, '').toLowerCase()
        value = s.match(/="([^"]*)"/)?.[1] || ''
      } else {
        attr = s.replace(/[\]\[]/g, '').toLowerCase()
      }
      return descendents.filter(n => {
        if (value !== undefined && value !== '') return n.attrs[attr] === value
        return attr in n.attrs
      })
    }
    return filterByTagAndAttr(descendents, s)
  }
}

// ─── NodeList ───

class NodeList {
  constructor(nodes) {
    this._nodes = nodes
    this.length = nodes.length
  }

  each(fn) {
    for (let i = 0; i < this._nodes.length; i++) {
      fn(i, new NodeWrapper(this._nodes[i]))
    }
  }

  /** 委托给第一个元素的 attr */
  attr(name) {
    if (this._nodes.length === 0) return null
    return this._nodes[0].attrs[name.toLowerCase()] || null
  }

  first() {
    return new NodeList(this._nodes.slice(0, 1))
  }

  [Symbol.iterator]() {
    return this._nodes.map(n => new NodeWrapper(n))[Symbol.iterator]()
  }
}

// ─── NodeWrapper ───

class NodeWrapper {
  constructor(node) {
    this._node = node
    this._tag = node.tag
  }

  /** 让 NodeWrapper 兼容 `if ($el.length)` 模式 */
  get length() {
    return this._node.tag === '#empty' ? 0 : 1
  }

  /**
   * 获取属性值。
   */
  attr(name) {
    return this._node.attrs[name.toLowerCase()] || null
  }

  /**
   * 检查是否为特定标签。
   */
  is(tag) {
    return this._node.tag === tag.toLowerCase()
  }

  /**
   * 当前节点的 tagName（兼容 cheerio 的 el.tagName 或 el.name）。
   */
  get tagName() {
    return this._node.tag
  }

  /** @deprecated — alias */
  get name() {
    return this._node.tag
  }

  /**
   * 在子树中查找匹配的元素。支持属性选择器 [attr] 和标签选择器。
   */
  find(selector) {
    // 只遍历子孙节点，不包含自身
    const descendents = this._node.children.flatMap(c => flatten(c))
    const s = selector.trim()

    // 属性选择器
    if (s.startsWith('[')) {
      let attr, value
      const eqIdx = s.indexOf('=')
      if (eqIdx > -1) {
        attr = s.slice(1, eqIdx).replace(/[\]\[]/g, '').toLowerCase()
        value = s.slice(eqIdx + 1).replace(/^"|"$/g, '').replace(/[\]\[]/g, '')
      } else {
        attr = s.replace(/[\]\[]/g, '').toLowerCase()
      }

      // 逗号分隔的多属性选择器
      if (attr.includes(',') && !value) {
        const cleanAttrs = attr.split(',').map(a => a.trim())
        const all = []
        for (const a of cleanAttrs) {
          all.push(...descendents.filter(n => a in n.attrs))
        }
        return new NodeList([...new Set(all)])
      }

      const results = descendents.filter(n => {
        if (value !== undefined && attr !== '') return n.attrs[attr] === value
        return attr in n.attrs
      })
      return new NodeList(results)
    }

    // 标签选择器
    return new NodeList(filterByTagAndAttr(descendents, s))
  }

  /**
   * 获取父节点。始终返回 NodeWrapper（无父节点时返回空节点）。
   */
  parent() {
    if (this._node.parent && this._node.parent.tag !== '#root') {
      return new NodeWrapper(this._node.parent)
    }
    return new NodeWrapper({ tag: '#empty', attrs: {}, children: [], parent: null, innerHTML: '' })
  }

  /**
   * 找最近的匹配属性的祖先。总是返回 NodeWrapper（找不到返回空节点）。
   */
  closest(attrSelector) {
    const attr = attrSelector.replace(/[\[\]]/g, '').toLowerCase()
    let current = this._node.parent
    while (current && current.tag !== '#root') {
      if (attr in current.attrs) return new NodeWrapper(current)
      current = current.parent
    }
    return new NodeWrapper({ tag: '#empty', attrs: {}, children: [], parent: null, innerHTML: '' })
  }

  /**
   * 是否有匹配属性选择器的祖先。
   */
  hasClosest(attrSelector) {
    const attr = attrSelector.replace(/[\[\]]/g, '').toLowerCase()
    let current = this._node.parent
    while (current && current.tag !== '#root') {
      if (attr in current.attrs) return true
      current = current.parent
    }
    return false
  }

  /**
   * 获取文本内容。
   */
  text() {
    return decodeEntities(stripTags(this._node.innerHTML || ''))
  }

  /**
   * 克隆节点（浅克隆，仅复制结构和属性）。
   */
  clone() {
    const c = { ...this._node, attrs: { ...this._node.attrs }, children: [...this._node.children] }
    return new NodeWrapper(c)
  }

  /**
   * 原始 DOM 节点（供内部使用）。
   */
  _raw() {
    return this._node
  }
}

/**
 * 剥离 HTML 标签，保留文本。
 */
function stripTags(html) {
  return html.replace(/<[^>]*>/g, '').trim()
}

/**
 * 解码基本 HTML 实体：&amp; &lt; &gt; &quot; &#39; &nbsp;
 */
function decodeEntities(str) {
  const entities = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&nbsp;': ' ',
  }
  return str.replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (m) => entities[m] || m)
}

/**
 * 获取元素的 innerHTML。
 * @param {NodeWrapper} $el
 */
export function getInnerHTML($el) {
  return $el._raw().innerHTML || ''
}

/**
 * 克隆元素的 HTML 字符串。
 * 从原始 HTML 中提取 innerHTML。
 */
export function cloneHTML($el) {
  const node = $el._raw()
  // 重建开标签
  let openTag = `<${node.tag}`
  for (const [k, v] of Object.entries(node.attrs)) {
    openTag += v === '' ? ` ${k}` : ` ${k}="${v}"`
  }
  openTag += '>'
  return openTag + (node.innerHTML || '') + `</${node.tag}>`
}
