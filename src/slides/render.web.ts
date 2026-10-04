import type { PickedFile } from '@/api/types';
import { translate } from '@/i18n';

import type { Slide } from './render';

export type { Slide } from './render';

// pdf.js грузится с CDN, только когда игрок нажал «Present with slides»; файл никуда не отправляется
const PDFJS = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build';
const MAX_SLIDES = 40;
const WIDTH = 960; // хватает для маленькой рамки на сцене

type PdfPage = {
  getViewport: (o: { scale: number }) => { width: number; height: number };
  render: (o: { canvasContext: CanvasRenderingContext2D; viewport: unknown; intent?: string }) => { promise: Promise<void> };
};
type PdfJs = {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (o: { data: ArrayBuffer }) => { promise: Promise<{ numPages: number; getPage: (n: number) => Promise<PdfPage> }> };
};

let loading: Promise<PdfJs> | null = null;

function loadPdfJs(): Promise<PdfJs> {
  loading ??= new Promise<PdfJs>((resolve, reject) => {
    const ready = () => (window as unknown as { pdfjsLib?: PdfJs }).pdfjsLib;
    const existing = ready();
    if (existing) return resolve(existing);
    const script = document.createElement('script');
    script.src = `${PDFJS}/pdf.min.js`;
    script.onload = () => {
      const lib = ready();
      if (!lib) return reject(new Error(translate('common', 'errSlidesViewer')));
      lib.GlobalWorkerOptions.workerSrc = `${PDFJS}/pdf.worker.min.js`;
      resolve(lib);
    };
    script.onerror = () => reject(new Error(translate('common', 'errSlidesViewer')));
    document.head.appendChild(script);
  });
  loading.catch(() => (loading = null));
  return loading;
}

/** Браузер: каждая страница PDF рисуется в картинку прямо во вкладке. */
export async function renderSlides(file: PickedFile): Promise<Slide[]> {
  const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.mimeType === 'application/pdf';
  if (!isPdf) throw new Error(translate('common', 'errSlidesPdf'));
  if (!file.file) throw new Error(translate('common', 'errSlidesRead'));
  const pdfjs = await loadPdfJs();
  const doc = await pdfjs.getDocument({ data: await file.file.arrayBuffer() }).promise;
  const slides: Slide[] = [];
  for (let n = 1; n <= Math.min(doc.numPages, MAX_SLIDES); n++) {
    const page = await doc.getPage(n);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: WIDTH / base.width });
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const context = canvas.getContext('2d');
    if (!context) throw new Error(translate('common', 'errSlidesDraw'));
    // intent: 'print' — рисуем сразу, не дожидаясь кадров анимации: иначе в свёрнутой вкладке слайды не дорисуются
    await page.render({ canvasContext: context, viewport, intent: 'print' }).promise;
    slides.push({ uri: canvas.toDataURL('image/jpeg', 0.85), ratio: canvas.width / canvas.height });
  }
  if (!slides.length) throw new Error(translate('common', 'errSlidesEmpty'));
  return slides;
}
