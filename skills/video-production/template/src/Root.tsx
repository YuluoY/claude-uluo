import React from 'react';
import { Composition } from 'remotion';
import { CaptionCards } from './compositions/CaptionCards';
import { Cover, type CoverProps } from './compositions/Cover';
import { Main, type MainProps } from './compositions/Main';
import { Stills, type StillsProps } from './compositions/Stills';
import { captions, settings, timeline } from './engine/data';
import { loadFonts } from './engine/fonts';

loadFonts();

export const RemotionRoot: React.FC = () => {
  const fp = settings.footage;
  const mainProps: MainProps = {};
  const stillsProps: StillsProps = { frames: [0] };
  const coverProps: CoverProps = { background: '', title: settings.title, subtitle: '' };
  return (
    <>
      <Composition
        id="Main"
        component={Main}
        durationInFrames={Math.max(1, timeline.durationInFrames)}
        fps={timeline.fps}
        width={timeline.width}
        height={timeline.height}
        defaultProps={mainProps}
      />
      <Composition
        id="Stills"
        component={Stills}
        durationInFrames={1}
        fps={timeline.fps}
        width={timeline.width}
        height={timeline.height}
        defaultProps={stillsProps}
        // Freeze 的目标帧会被夹到本合成时长以内，所以时长要和整片一样长；vp.py 只渲染前 frames.length 帧
        calculateMetadata={({ props }) => ({ durationInFrames: Math.max(1, props.frames.length, timeline.durationInFrames) })}
      />
      <Composition
        id="CaptionCards"
        component={CaptionCards}
        durationInFrames={Math.max(1, captions.blocks.length)}
        fps={30}
        width={fp?.width ?? timeline.width}
        height={fp?.height ?? timeline.height}
      />
      <Composition
        id="Cover"
        component={Cover}
        durationInFrames={1}
        fps={30}
        width={settings.cover.width}
        height={settings.cover.height}
        defaultProps={coverProps}
      />
    </>
  );
};
