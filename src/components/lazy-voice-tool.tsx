import { lazy } from "react";

const VoiceToolComponent = lazy(() =>
  import("./voice-tool").then((m) => ({ default: m.VoiceTool })),
);

export { VoiceToolComponent as VoiceTool };