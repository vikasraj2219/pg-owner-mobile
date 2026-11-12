// @ts-expect-error qrcode lacks bundled types in this environment
import QRCode from 'qrcode';

export interface QrSvgPathResult {
  path: string;
  cellSize: number;
}

export function generateQrSvgPath(value: string, size: number): QrSvgPathResult {
  try {
    const qrData = QRCode.create(value, { errorCorrectionLevel: 'M' });
    const arr: number[] = Array.prototype.slice.call(qrData.modules.data, 0);
    const sqrt = Math.sqrt(arr.length);
    const matrix: number[][] = [];

    for (let i = 0; i < arr.length; i++) {
      if (i % sqrt === 0) {
        matrix.push([arr[i]]);
      } else {
        matrix[matrix.length - 1].push(arr[i]);
      }
    }

    const cellSize = size / matrix.length;
    let path = '';

    matrix.forEach((row, i) => {
      let needDraw = false;
      row.forEach((column, j) => {
        if (column) {
          if (!needDraw) {
            path += `M${cellSize * j} ${cellSize / 2 + cellSize * i} `;
            needDraw = true;
          }
          if (needDraw && j === row.length - 1) {
            path += `L${cellSize * (j + 1)} ${cellSize / 2 + cellSize * i} `;
          }
        } else {
          if (needDraw) {
            path += `L${cellSize * j} ${cellSize / 2 + cellSize * i} `;
            needDraw = false;
          }
        }
      });
    });

    return { path, cellSize };
  } catch (err) {
    console.error('Error generating QR SVG path:', err);
    return { path: '', cellSize: 1 };
  }
}
