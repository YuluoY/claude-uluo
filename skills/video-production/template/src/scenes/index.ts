// 场景注册表：storyboard.json 里 source.component 用的名字都要在这里能找到。
// 已安装类型包（src/genres/*）导出的场景会自动并入；自己写的场景放在 src/scenes/ 下，在下面登记。
import type { SceneComponent } from '../engine/types';
import { genreScenes } from '../genres';

export const scenes: Record<string, SceneComponent> = {
  ...genreScenes,
  // 例：MyScene,（先 import { MyScene } from './MyScene';）
};
