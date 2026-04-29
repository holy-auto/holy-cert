import { registerRoot } from "remotion";
import { LedraVideo } from "./LedraVideo";
import { Composition } from "remotion";

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="LedraIntro"
        component={LedraVideo}
        durationInFrames={9000} // 5 min @ 30fps
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{}}
      />
    </>
  );
};

registerRoot(RemotionRoot);
