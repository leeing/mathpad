import Konva from 'konva';

export type CropOptions = {
  layerId: string;
  padding: number;
  pixelRatio: number;
  background: string;
};

export type AnswerSheetOptions = {
  layerId: string;
  padding: number;
  pixelRatio: number;
  pageWidthPx: number;
  pageHeightPx: number;
  marginPx: number;
  background: string;
  border: boolean;
};

function clampRectToStage(stage: Konva.Stage, rect: { x: number; y: number; width: number; height: number }) {
  const x = Math.max(0, rect.x);
  const y = Math.max(0, rect.y);
  const maxW = stage.width() - x;
  const maxH = stage.height() - y;
  const width = Math.max(1, Math.min(rect.width, maxW));
  const height = Math.max(1, Math.min(rect.height, maxH));
  return { x, y, width, height };
}

function getLayerClientRect(stage: Konva.Stage, layerId: string) {
  const node = stage.findOne(`#${layerId}`);
  if (!node) return null;
  const rect = node.getClientRect({ skipShadow: true, skipStroke: false });
  if (!Number.isFinite(rect.x) || !Number.isFinite(rect.y) || rect.width <= 0 || rect.height <= 0) return null;
  return rect;
}

async function dataUrlToImage(dataUrl: string): Promise<HTMLImageElement> {
  return await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image load failed'));
    img.src = dataUrl;
  });
}

export async function exportCroppedPng(stage: Konva.Stage, opts: CropOptions): Promise<string | null> {
  const rect0 = getLayerClientRect(stage, opts.layerId);
  if (!rect0) return null;

  const rect = clampRectToStage(stage, {
    x: rect0.x - opts.padding,
    y: rect0.y - opts.padding,
    width: rect0.width + opts.padding * 2,
    height: rect0.height + opts.padding * 2,
  });

  const stageDataUrl = stage.toDataURL({ x: rect.x, y: rect.y, width: rect.width, height: rect.height, pixelRatio: opts.pixelRatio });
  const img = await dataUrlToImage(stageDataUrl);

  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(rect.width * opts.pixelRatio);
  canvas.height = Math.floor(rect.height * opts.pixelRatio);
  const ctx = canvas.getContext('2d');
  if (!ctx) return stageDataUrl;
  ctx.fillStyle = opts.background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
}

export async function exportAnswerSheetPng(stage: Konva.Stage, opts: AnswerSheetOptions): Promise<string | null> {
  const rect0 = getLayerClientRect(stage, opts.layerId);
  if (!rect0) return null;

  const rect = clampRectToStage(stage, {
    x: rect0.x - opts.padding,
    y: rect0.y - opts.padding,
    width: rect0.width + opts.padding * 2,
    height: rect0.height + opts.padding * 2,
  });

  const stageDataUrl = stage.toDataURL({ x: rect.x, y: rect.y, width: rect.width, height: rect.height, pixelRatio: opts.pixelRatio });
  const img = await dataUrlToImage(stageDataUrl);

  const canvas = document.createElement('canvas');
  canvas.width = opts.pageWidthPx;
  canvas.height = opts.pageHeightPx;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = opts.background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (opts.border) {
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 2;
    ctx.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);
  }

  const safeX = opts.marginPx;
  const safeY = opts.marginPx;
  const safeW = canvas.width - opts.marginPx * 2;
  const safeH = canvas.height - opts.marginPx * 2;

  const drawW = safeW;
  const drawH = safeH;
  const scale = Math.min(drawW / img.width, drawH / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  const x = safeX + (drawW - w) / 2;
  const y = safeY + (drawH - h) / 2;
  ctx.drawImage(img, x, y, w, h);

  return canvas.toDataURL('image/png');
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

