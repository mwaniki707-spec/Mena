import { lazy } from "react";

const EmailToolComponent = lazy(() =>
  import("./email-tool").then((m) => ({ default: m.EmailTool })),
);

export { EmailToolComponent as EmailTool };