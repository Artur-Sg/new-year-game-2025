const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const sourcePath = path.resolve('src/assets/forest/Enviroment.png');
const outputDir = path.resolve('src/assets/forest/slices');
const manifestPath = path.resolve('src/core/assets/forestSlices.ts');
const previewPath = path.resolve('src/assets/forest/slices/preview.png');

const minPixels = 20;
const padding = 8;
const columns = 6;

const buffer = fs.readFileSync(sourcePath);
const png = PNG.sync.read(buffer);
const { width, height, data } = png;

const visited = new Uint8Array(width * height);
const components = [];

const getIndex = (x, y) => (y * width + x);
const getAlpha = (x, y) => data[getIndex(x, y) * 4 + 3];

for (let y = 0; y < height; y += 1) {
  for (let x = 0; x < width; x += 1) {
    const idx = getIndex(x, y);
    if (visited[idx] || getAlpha(x, y) === 0) {
      continue;
    }

    const stack = [[x, y]];
    visited[idx] = 1;
    let minX = x;
    let maxX = x;
    let minY = y;
    let maxY = y;
    let pixelCount = 0;

    while (stack.length > 0) {
      const [cx, cy] = stack.pop();
      pixelCount += 1;
      if (cx < minX) minX = cx;
      if (cx > maxX) maxX = cx;
      if (cy < minY) minY = cy;
      if (cy > maxY) maxY = cy;

      for (let ny = cy - 1; ny <= cy + 1; ny += 1) {
        for (let nx = cx - 1; nx <= cx + 1; nx += 1) {
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
            continue;
          }
          const nidx = getIndex(nx, ny);
          if (visited[nidx] || getAlpha(nx, ny) === 0) {
            continue;
          }
          visited[nidx] = 1;
          stack.push([nx, ny]);
        }
      }
    }

    if (pixelCount >= minPixels) {
      components.push({
        x: minX,
        y: minY,
        width: maxX - minX + 1,
        height: maxY - minY + 1,
        pixels: pixelCount,
      });
    }
  }
}

components.sort((a, b) => (a.y - b.y) || (a.x - b.x));

fs.mkdirSync(outputDir, { recursive: true });

const slices = components.map((component, index) => {
  const id = String(index + 1).padStart(2, '0');
  const filename = `env-${id}.png`;
  const key = `env-slice-${id}`;
  const slicePng = new PNG({ width: component.width, height: component.height });

  for (let y = 0; y < component.height; y += 1) {
    for (let x = 0; x < component.width; x += 1) {
      const srcX = component.x + x;
      const srcY = component.y + y;
      const srcIdx = getIndex(srcX, srcY) * 4;
      const dstIdx = (y * component.width + x) * 4;
      slicePng.data[dstIdx] = data[srcIdx];
      slicePng.data[dstIdx + 1] = data[srcIdx + 1];
      slicePng.data[dstIdx + 2] = data[srcIdx + 2];
      slicePng.data[dstIdx + 3] = data[srcIdx + 3];
    }
  }

  fs.writeFileSync(path.join(outputDir, filename), PNG.sync.write(slicePng));

  return {
    key,
    filename,
    x: component.x,
    y: component.y,
    width: component.width,
    height: component.height,
    pixels: component.pixels,
  };
});

const maxWidth = Math.max(...slices.map((slice) => slice.width));
const maxHeight = Math.max(...slices.map((slice) => slice.height));
const cellWidth = maxWidth + padding;
const cellHeight = maxHeight + padding;
const rows = Math.ceil(slices.length / columns);
const preview = new PNG({ width: cellWidth * columns, height: cellHeight * rows });

for (let i = 0; i < slices.length; i += 1) {
  const col = i % columns;
  const row = Math.floor(i / columns);
  const slice = slices[i];
  const slicePath = path.join(outputDir, slice.filename);
  const slicePng = PNG.sync.read(fs.readFileSync(slicePath));
  const offsetX = col * cellWidth;
  const offsetY = row * cellHeight;
  for (let y = 0; y < slicePng.height; y += 1) {
    for (let x = 0; x < slicePng.width; x += 1) {
      const srcIdx = (y * slicePng.width + x) * 4;
      const dstIdx = ((offsetY + y) * preview.width + (offsetX + x)) * 4;
      preview.data[dstIdx] = slicePng.data[srcIdx];
      preview.data[dstIdx + 1] = slicePng.data[srcIdx + 1];
      preview.data[dstIdx + 2] = slicePng.data[srcIdx + 2];
      preview.data[dstIdx + 3] = slicePng.data[srcIdx + 3];
    }
  }
}

fs.writeFileSync(previewPath, PNG.sync.write(preview));

const manifestLines = [];
manifestLines.push('export const forestSlices = [');
for (const slice of slices) {
  manifestLines.push(
    `  { key: '${slice.key}', filename: '${slice.filename}', width: ${slice.width}, height: ${slice.height}, x: ${slice.x}, y: ${slice.y} },`
  );
}
manifestLines.push('] as const;');
manifestLines.push('');
manifestLines.push('export const forestForegroundKeys = forestSlices');
manifestLines.push('  .filter((slice) => slice.height >= 100 && slice.width >= 45)');
manifestLines.push('  .map((slice) => slice.key);');
manifestLines.push('');

fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
fs.writeFileSync(manifestPath, manifestLines.join('\n'));

console.log(`Slices: ${slices.length}`);
console.log(`Preview: ${previewPath}`);
console.log(`Manifest: ${manifestPath}`);
