// 画面文字总开关：sceneText=off 时隐藏所有说明性文字（标题、标签、正文、注释条），
// 只保留"必须精确"的内容——代码、数值、字幕、章节条。
// TextBlock / FitText / Text / Label / SceneTitle 已经自动遵守；自定义场景用 useSceneText() 判断。
import { settings } from './data';

export const useSceneText = (): boolean => settings.sceneText !== 'off';
