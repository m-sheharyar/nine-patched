import { downloadBlob } from './downloadBlob';

export function downloadCanvasAsPng(canvas: HTMLCanvasElement, fileName: string): void {
  canvas.toBlob((blob) => {
    if (!blob) return;
    downloadBlob(blob, fileName);
  }, 'image/png');
}
