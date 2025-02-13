import "react";
import type e from "electron";

declare module "react" {
  interface CSSProperties {
    WebkitAppRegion?: string;
  }
}

export type Electron = typeof e;
