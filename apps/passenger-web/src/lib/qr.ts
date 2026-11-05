import QRCode from 'qrcode';

/**
 * The signed ticket payload as one SVG path (a 1-module quiet zone is included
 * in `size`), so the code renders crisp at any size without an image request.
 */
export function qrSvgPath(payload: string) {
  const { modules } = QRCode.create(payload, { errorCorrectionLevel: 'M' });
  const margin = 1;
  let path = '';
  for (let row = 0; row < modules.size; row += 1) {
    for (let column = 0; column < modules.size; column += 1) {
      if (modules.get(row, column)) path += `M${column + margin} ${row + margin}h1v1h-1z`;
    }
  }
  return { path, size: modules.size + margin * 2 };
}
