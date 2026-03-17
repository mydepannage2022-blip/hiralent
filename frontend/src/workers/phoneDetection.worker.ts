/* eslint-disable @typescript-eslint/no-explicit-any */
// Runs in a Web Worker — CPU inference here does NOT block the main thread UI.

import '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

let model: any = null;

async function init() {
  try {
    model = await (cocoSsd as any).load({ base: 'lite_mobilenet_v2' });
    (self as any).postMessage({ type: 'READY' });
  } catch (err) {
    (self as any).postMessage({ type: 'ERROR', message: String(err) });
  }
}

(self as any).onmessage = async (event: MessageEvent) => {
  if (event.data.type === 'STOP') {
    (self as any).close();
    return;
  }

  if (event.data.type === 'DETECT' && model) {
    try {
      // ImageData is structured-cloneable — no OffscreenCanvas needed
      const predictions = await model.detect(event.data.imageData as ImageData);
      (self as any).postMessage({ type: 'RESULT', predictions });
    } catch {
      (self as any).postMessage({ type: 'RESULT', predictions: [] });
    }
  }
};

init();
