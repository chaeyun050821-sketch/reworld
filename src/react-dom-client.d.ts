declare module "react-dom/client" {
  import type { ReactNode } from "react";

  export type Root = {
    render(children: ReactNode): void;
    unmount(): void;
  };

  export function createRoot(container: Element | DocumentFragment): Root;
}

declare module "react-dom" {
  import type { ReactNode } from "react";

  export function createPortal(children: ReactNode, container: Element | DocumentFragment): ReactNode;
}
