// 镜头堆叠与转场。
// 防闪规则：后一镜盖在前一镜之上进入（淡入/滑入/擦除），前一镜在转场结束前保持完整显示，
// 不做两边同时半透明的叠化，所以转场中途不会透出底色、不会亮度塌陷。
import React from 'react';
import { AbsoluteFill, Freeze, Img, Loop, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { scenes } from '../scenes';
import { ease, lerp } from './motion';
import { ShotProvider } from './shot';
import { useTheme } from './theme';
import type { ClipSource, ImageSource, ShotData } from './types';

const TransitionIn: React.FC<{ shot: ShotData; children: React.ReactNode }> = ({ shot, children }) => {
  const frame = useCurrentFrame();
  const theme = useTheme();
  const { type, durationInFrames: d } = shot.transition;
  if (type === 'cut' || d <= 0 || frame >= d) {
    return <AbsoluteFill>{children}</AbsoluteFill>;
  }
  const p = ease(theme, frame / d);
  let style: React.CSSProperties = {};
  if (type === 'fade') {
    style = { opacity: p };
  } else if (type === 'slide') {
    style = { transform: `translateX(${(1 - p) * 100}%)` };
  } else if (type === 'wipe') {
    style = { clipPath: `inset(0 ${(1 - p) * 100}% 0 0)` };
  }
  return <AbsoluteFill style={style}>{children}</AbsoluteFill>;
};

const ClipShot: React.FC<{ source: ClipSource }> = ({ source }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const volume = source.volume ?? 0;
  const video = (
    <OffthreadVideo
      src={staticFile(source.file)}
      trimBefore={source.trimStartSec ? Math.round(source.trimStartSec * fps) : undefined}
      playbackRate={source.playbackRate ?? 1}
      muted={volume === 0}
      volume={volume}
      style={{ width: '100%', height: '100%', objectFit: source.fit ?? 'cover' }}
    />
  );
  const clipFrames = source.clipDurationInFrames;
  let body: React.ReactNode = video;
  if (clipFrames !== undefined && clipFrames > 0) {
    body = source.loop ? (
      <Loop durationInFrames={clipFrames}>{video}</Loop>
    ) : (
      // 片段比镜头短时停在最后一帧，而不是露出底色
      <Freeze frame={clipFrames - 1} active={frame >= clipFrames}>
        {video}
      </Freeze>
    );
  }
  return <AbsoluteFill style={{ backgroundColor: source.background ?? '#000' }}>{body}</AbsoluteFill>;
};

const ImageShot: React.FC<{ source: ImageSource; duration: number }> = ({ source, duration }) => {
  const frame = useCurrentFrame();
  const scale = source.kenBurns ? lerp(frame, [0, Math.max(1, duration)], [1, 1.08]) : 1;
  return (
    <AbsoluteFill style={{ backgroundColor: source.background ?? '#000', overflow: 'hidden' }}>
      <Img
        src={staticFile(source.file)}
        style={{ width: '100%', height: '100%', objectFit: source.fit ?? 'cover', transform: `scale(${scale})` }}
      />
    </AbsoluteFill>
  );
};

const ShotContent: React.FC<{ shot: ShotData }> = ({ shot }) => {
  const src = shot.source;
  if (src.type === 'clip') {
    return <ClipShot source={src} />;
  }
  if (src.type === 'image') {
    return <ImageShot source={src} duration={shot.durationInFrames} />;
  }
  const Component = scenes[src.component];
  if (!Component) {
    throw new Error(`镜头 ${shot.id}：场景组件 ${src.component} 没有注册；可用：${Object.keys(scenes).sort().join(', ')}`);
  }
  return <Component props={src.props ?? {}} shot={shot} />;
};

export const ShotStack: React.FC<{ shots: ShotData[] }> = ({ shots }) => (
  <AbsoluteFill>
    {shots.map((shot, i) => {
      // 下一镜进入的转场期间，本镜继续显示在下面
      const overlap = i + 1 < shots.length ? shots[i + 1].transition.durationInFrames : 0;
      return (
        <Sequence key={shot.id} name={`镜头 ${shot.id}`} from={shot.from} durationInFrames={shot.durationInFrames + overlap}>
          <ShotProvider shot={shot}>
            <TransitionIn shot={shot}>
              <ShotContent shot={shot} />
            </TransitionIn>
          </ShotProvider>
        </Sequence>
      );
    })}
  </AbsoluteFill>
);
