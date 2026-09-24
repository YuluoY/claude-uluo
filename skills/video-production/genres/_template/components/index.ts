// 类型包入口：scenes 里的组件可以在 storyboard 的 source.component 里直接用。
import type { SceneComponent } from '../../engine/types';
import { YourScene } from './YourScene';

export const scenes: Record<string, SceneComponent> = { YourScene };
