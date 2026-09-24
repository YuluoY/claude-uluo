// 字体：主题字体由 npm 字体包（fontsource，OFL 授权）随项目安装，打包进 Remotion，渲染时不联网；
// Mac、Linux 渲染结果一致，不依赖系统里有没有中文字体。
// FontGate 等本片实际用到的字形全部加载完才渲染场景：文字排版要先测量，字体没到位测出来就不准。
import React, { useEffect, useState } from 'react';
import { cancelRender, continueRender, delayRender, staticFile } from 'remotion';
import { FONT_FACES } from '../generated/fonts';
import { settings } from './data';

let ready = false;
let loading: Promise<void> | null = null;

const BASIC = ' 0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz，。、：；！？（）“”《》—…·%+-=/.,:;!?()[]{}<>#&*@';

const loadAll = async (): Promise<void> => {
  // 不让浏览器合成假粗体/假斜体：只有单一字重的西文字体（如 Archivo Black）按原样显示，测量与渲染一致
  document.documentElement.style.setProperty('font-synthesis', 'none');
  // 1. video.config.json 里 fonts 声明的自定义字体文件
  await Promise.all(
    settings.fonts.map(async (f) => {
      const face = new FontFace(f.family, `url(${staticFile(f.file)})`, { weight: f.weight ?? '100 900', style: f.style ?? 'normal' });
      await face.load();
      document.fonts.add(face);
    }),
  );
  // 2. 主题字体包：按本片用到的字形加载对应的 unicode-range 分片
  const glyphs = (settings.glyphs ?? '') + BASIC;
  const missing: string[] = [];
  await Promise.all(
    FONT_FACES.flatMap((f) =>
      f.weights.map(async (w) => {
        const faces = await document.fonts.load(`${f.style ?? 'normal'} ${w} 64px "${f.family}"`, glyphs);
        if (faces.length === 0) {
          missing.push(`${f.family} ${w}`);
        }
      }),
    ),
  );
  if (missing.length) {
    throw new Error(`字体没有加载成功：${missing.join('，')}。检查 src/generated/fonts.ts 与 package.json 里的字体包（运行 vp.py build）`);
  }
  await document.fonts.ready;
};

export const ensureFonts = (): Promise<void> => {
  if (!loading) {
    loading = loadAll().then(() => {
      ready = true;
    });
  }
  return loading;
};

export const FontGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ok, setOk] = useState(ready);
  const [handle] = useState(() => (ready ? null : delayRender('等待字体加载')));
  useEffect(() => {
    if (ok) {
      return;
    }
    ensureFonts()
      .then(() => setOk(true))
      .catch((err: unknown) => cancelRender(err instanceof Error ? err : new Error(String(err))));
  }, [ok]);
  useEffect(() => {
    if (ok && handle !== null) {
      continueRender(handle);
    }
  }, [ok, handle]);
  return ok ? <>{children}</> : null;
};
