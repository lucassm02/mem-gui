import "react";

declare module "react" {
  interface CSSProperties {
    WebkitAppRegion?: string;
  }
}
