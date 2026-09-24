// shiki 同步高亮器（JavaScript 正则引擎，不需要 wasm、不需要异步加载），渲染每一帧时结果完全确定。
// 内置的语言与配色见下面两个列表；风格 theme.json 的 code.theme 只能从 THEMES 里选。
import { createHighlighterCoreSync, type ThemedToken } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import bash from 'shiki/langs/bash.mjs';
import c from 'shiki/langs/c.mjs';
import cpp from 'shiki/langs/cpp.mjs';
import csharp from 'shiki/langs/csharp.mjs';
import go from 'shiki/langs/go.mjs';
import java from 'shiki/langs/java.mjs';
import javascript from 'shiki/langs/javascript.mjs';
import json from 'shiki/langs/json.mjs';
import kotlin from 'shiki/langs/kotlin.mjs';
import php from 'shiki/langs/php.mjs';
import python from 'shiki/langs/python.mjs';
import ruby from 'shiki/langs/ruby.mjs';
import rust from 'shiki/langs/rust.mjs';
import scala from 'shiki/langs/scala.mjs';
import sql from 'shiki/langs/sql.mjs';
import swift from 'shiki/langs/swift.mjs';
import tsx from 'shiki/langs/tsx.mjs';
import typescript from 'shiki/langs/typescript.mjs';
import dracula from 'shiki/themes/dracula.mjs';
import githubDark from 'shiki/themes/github-dark.mjs';
import githubLight from 'shiki/themes/github-light.mjs';
import minDark from 'shiki/themes/min-dark.mjs';
import minLight from 'shiki/themes/min-light.mjs';
import nord from 'shiki/themes/nord.mjs';
import oneDarkPro from 'shiki/themes/one-dark-pro.mjs';
import vitesseDark from 'shiki/themes/vitesse-dark.mjs';
import vitesseLight from 'shiki/themes/vitesse-light.mjs';

export const THEMES = ['github-dark', 'github-light', 'one-dark-pro', 'vitesse-dark', 'vitesse-light', 'min-light', 'min-dark', 'nord', 'dracula'];

export const highlighter = createHighlighterCoreSync({
  themes: [githubDark, githubLight, oneDarkPro, vitesseDark, vitesseLight, minLight, minDark, nord, dracula],
  langs: [typescript, javascript, tsx, python, java, cpp, c, go, rust, kotlin, swift, csharp, ruby, php, scala, sql, bash, json],
  engine: createJavaScriptRegexEngine({ forgiving: true }),
});

const LOADED = new Set(highlighter.getLoadedLanguages());

/** 不认识的语言按纯文本处理（不报错，只是没有语法着色） */
export const langOrText = (lang: string): string => (LOADED.has(lang) ? lang : 'text');

const cache = new Map<string, { lines: ThemedToken[][]; fg: string; bg: string }>();

export const tokenize = (code: string, lang: string, theme: string) => {
  const key = `${theme}\u0000${lang}\u0000${code}`;
  const hit = cache.get(key);
  if (hit) {
    return hit;
  }
  const r = highlighter.codeToTokens(code, { lang: langOrText(lang), theme });
  const out = { lines: r.tokens, fg: r.fg ?? '#ccc', bg: r.bg ?? '#000' };
  cache.set(key, out);
  return out;
};

/** 显示宽度（等宽字体下的列数）：东亚全角字符按 2 列 */
export const columns = (s: string): number => {
  let n = 0;
  for (const ch of s) {
    const cp = ch.codePointAt(0) ?? 0;
    n += isWide(cp) ? 2 : 1;
  }
  return n;
};

const isWide = (cp: number): boolean =>
  (cp >= 0x1100 && cp <= 0x115f) ||
  (cp >= 0x2e80 && cp <= 0xa4cf) ||
  (cp >= 0xac00 && cp <= 0xd7a3) ||
  (cp >= 0xf900 && cp <= 0xfaff) ||
  (cp >= 0xfe30 && cp <= 0xfe4f) ||
  (cp >= 0xff00 && cp <= 0xff60) ||
  (cp >= 0xffe0 && cp <= 0xffe6) ||
  (cp >= 0x1f300 && cp <= 0x1faff) ||
  (cp >= 0x20000 && cp <= 0x3fffd);
