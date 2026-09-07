import { lazy } from "react";

const GoogleDriveComponent = lazy(() =>
  import("./google-drive").then((m) => ({ default: m.GoogleDrive })),
);

export { GoogleDriveComponent as GoogleDrive };