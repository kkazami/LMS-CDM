import React from "react";
import type { ThreeElements } from "@react-three/fiber";

declare global {
  namespace JSX {
    type Element = React.JSX.Element;
    interface IntrinsicElements extends ThreeElements, React.JSX.IntrinsicElements {}
  }
}

declare module "react" {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
  interface StyleHTMLAttributes<T> extends React.HTMLAttributes<T> {
    jsx?: boolean;
    global?: boolean;
  }
}

declare module "@react-three/fiber" {
  interface CanvasProps {
    className?: string;
  }
}
