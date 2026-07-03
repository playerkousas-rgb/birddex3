import { useEffect, useRef, useState } from 'react';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import '@tensorflow/tfjs';

export interface LiveDetection {
  x: number; y: number; width: number; height: number;
  score: number;
  class: string;
}

const BIRD_CLASSES = new Set(['bird']);

export function useLiveBirdDetector(
  videoEl: HTMLVideoElement | null,
  enabled: boolean
) {
  const modelRef = useRef<cocoSsd.ObjectDetection | null>(null);
  const rafRef = useRef<number>(0);
  const [detections, setDetections] = useState<LiveDetection[]>([]);
  const [loading, setLoading] = useState(true);
  const [fps, setFps] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    cocoSsd.load({ base: 'lite_mobilenet_v2' }).then(m => {
      if (cancelled) return;
      modelRef.current = m;
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!enabled || !videoEl || !modelRef.current || loading) {
      setDetections([]);
      return;
    }
    let lastTs = performance.now();
    let frames = 0;
    let lastDetect = 0;

    const loop = async () => {
      rafRef.current = requestAnimationFrame(loop);
      const now = performance.now();
      frames++;
      if (now - lastTs > 1000) {
        setFps(frames);
        frames = 0;
        lastTs = now;
      }
      // 限制偵測頻率 ~5 fps，省電
      if (now - lastDetect < 200) return;
      lastDetect = now;

      if (videoEl.readyState < 2 || videoEl.videoWidth === 0) return;
      try {
        const preds = await modelRef.current!.detect(videoEl, 20, 0.45);
        const birds: LiveDetection[] = preds
          .filter(p => BIRD_CLASSES.has(p.class))
          .map(p => ({
            x: p.bbox[0] / videoEl.videoWidth,
            y: p.bbox[1] / videoEl.videoHeight,
            width: p.bbox[2] / videoEl.videoWidth,
            height: p.bbox[3] / videoEl.videoHeight,
            score: p.score,
            class: p.class,
          }));
        setDetections(birds);
      } catch { /* ignore */ }
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [enabled, videoEl, loading]);

  return { detections, loading, fps, ready: !!modelRef.current && !loading };
}
