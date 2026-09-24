// Remotion CLI 配置。渲染参数（编码、码率、帧范围等）由 vp.py 按 video.config.json 传入，这里只放不随项目变化的设置。
import { Config } from '@remotion/cli/config';

Config.setEntryPoint('src/index.ts');
Config.setOverwriteOutput(true);
