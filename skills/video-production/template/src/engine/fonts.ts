// 加载 video.config.json 里 fonts 声明的本地字体（放在 public/ 下）。
// Linux 上渲染中文必须提供中文字体文件；字体没加载完之前不截帧（delayRender）。
import { cancelRender, continueRender, delayRender, staticFile } from 'remotion';
import { settings } from './data';

let started = false;

export const loadFonts = (): void => {
  if (started || settings.fonts.length === 0 || typeof document === 'undefined') {
    return;
  }
  started = true;
  const handle = delayRender('加载字体');
  Promise.all(
    settings.fonts.map(async (f) => {
      const face = new FontFace(f.family, `url(${staticFile(f.file)})`, {
        weight: f.weight ?? '100 900',
        style: f.style ?? 'normal',
      });
      await face.load();
      document.fonts.add(face);
    }),
  )
    .then(() => continueRender(handle))
    .catch((err: unknown) => cancelRender(new Error(`字体加载失败（检查 video.config.json 的 fonts 与 public/ 下的文件）：${String(err)}`)));
};
