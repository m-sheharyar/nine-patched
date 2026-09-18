export type Shape = 'rounded' | 'pill' | 'ellipse' | 'rectangle';
export type FillType = 'solid' | 'gradient';

export interface Region {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface GradientStop {
  color: string;
  position: number; // 0-100 %
  opacity: number; // 0-100 %
}

/** Everything needed to render a 9-patch image, serialisable and free of UI concerns. */
export interface NinePatchConfig {
  shape: Shape;
  contentWidth: number;
  contentHeight: number;
  cornerRadius: number;
  fillType: FillType;
  fillColor: string;
  fillOpacity: number;
  gradientStops: GradientStop[];
  gradientAngle: number; // CSS convention: 0deg = to top, 90deg = to right
  bgTransparent: boolean;
  backgroundColor: string;
  borderWidth: number;
  borderColor: string;
  stretchEnabled: boolean;
  stretchAuto: boolean;
  stretch: Region;
  contentEnabled: boolean;
  contentAuto: boolean;
  content: Region;
}

/** The slice of a 2D canvas context the renderer uses, so a non-browser canvas can be passed in. */
export type NinePatchContext = Pick<
  CanvasRenderingContext2D,
  | 'fillStyle'
  | 'clearRect'
  | 'fillRect'
  | 'beginPath'
  | 'closePath'
  | 'moveTo'
  | 'lineTo'
  | 'arcTo'
  | 'ellipse'
  | 'fill'
  | 'createLinearGradient'
>;
