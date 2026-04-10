declare module "react-simple-maps" {
  import type { ComponentType, ReactNode } from "react";

  interface ComposableMapProps {
    projection?: string;
    projectionConfig?: {
      scale?: number;
      center?: [number, number];
      rotate?: [number, number, number];
    };
    className?: string;
    children?: ReactNode;
  }

  interface ZoomableGroupProps {
    center?: [number, number];
    zoom?: number;
    children?: ReactNode;
  }

  interface GeographiesProps {
    geography: string | object;
    children: (data: { geographies: GeographyFeature[] }) => ReactNode;
  }

  interface GeographyFeature {
    rsmKey: string;
    id: string;
    properties: Record<string, unknown>;
    type: string;
    geometry: object;
  }

  interface GeographyStyleState {
    outline?: string;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
  }

  interface GeographyProps {
    geography: GeographyFeature;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
    style?: {
      default?: GeographyStyleState;
      hover?: GeographyStyleState;
      pressed?: GeographyStyleState;
    };
  }

  export const ComposableMap: ComponentType<ComposableMapProps>;
  export const ZoomableGroup: ComponentType<ZoomableGroupProps>;
  export const Geographies: ComponentType<GeographiesProps>;
  export const Geography: ComponentType<GeographyProps>;
}
