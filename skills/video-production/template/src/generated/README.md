# src/generated

这里的文件都由 `vp.py` 生成（build / init），不要手改：

- `timeline.json`：镜头、句子、词元、提示点、算法步骤的帧号
- `captions.json`：切好的字幕块
- `settings.json`：画幅、字幕样式、叠加层、字体、全部可用风格
- `traces.json`：算法 trace（src/algo/<id>/trace.ts 的运行结果）
- `fonts.ts`：当前风格用到的字体包（npm，OFL 授权）的 CSS 引入与要预加载的字重
