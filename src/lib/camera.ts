/** One camera owner; late permission prompts/retries can never leak a stream. */
export class CameraSession {
  private epoch = 0;
  private stream: MediaStream | null = null;
  private video: HTMLVideoElement | null = null;
  constructor(private getMedia = () => navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false,
  })) {}
  get track() { return this.stream?.getVideoTracks()[0] ?? null; }
  stop() {
    this.epoch++;
    this.stream?.getTracks().forEach(track => track.stop());
    if (this.video?.srcObject === this.stream) this.video.srcObject = null;
    this.stream = null;
    this.video = null;
  }
  async open(video: HTMLVideoElement): Promise<MediaStream | null> {
    this.stop();
    const epoch = this.epoch;
    try {
      const stream = await this.getMedia();
      if (epoch !== this.epoch) { stream.getTracks().forEach(track => track.stop()); return null; }
      this.stream = stream;
      this.video = video;
      video.srcObject = stream;
      await video.play();
      return epoch === this.epoch ? stream : null;
    } catch (error) {
      if (epoch !== this.epoch) return null;
      this.stop();
      throw error;
    }
  }
}

/** Source rectangle corresponding to object-cover + centered digital zoom. */
export function cameraCrop(width: number, height: number, viewWidth: number, viewHeight: number, zoom = 1) {
  if (![width, height, viewWidth, viewHeight, zoom].every(Number.isFinite) || Math.min(width, height, viewWidth, viewHeight) <= 0) {
    throw new Error('相機畫面尚未準備好，請稍後再試。');
  }
  const scale = Math.max(viewWidth / width, viewHeight / height) * Math.max(1, zoom);
  const cropWidth = viewWidth / scale, cropHeight = viewHeight / scale;
  return { x: (width - cropWidth) / 2, y: (height - cropHeight) / 2, width: cropWidth, height: cropHeight };
}

export function drawCameraFrame(video: HTMLVideoElement, canvas: HTMLCanvasElement, zoom: number, viewport?: { width: number; height: number }) {
  const crop = cameraCrop(video.videoWidth, video.videoHeight, viewport?.width || video.clientWidth || video.videoWidth, viewport?.height || video.clientHeight || video.videoHeight, zoom);
  canvas.width = Math.max(1, Math.round(crop.width));
  canvas.height = Math.max(1, Math.round(crop.height));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('無法取得相機畫面');
  context.drawImage(video, crop.x, crop.y, crop.width, crop.height, 0, 0, canvas.width, canvas.height);
}

/** Relative edge score only: select the clearest burst frame, never reject a bird by a heuristic. */
export function sharpness(pixels: Uint8ClampedArray, width: number, height: number): number {
  let score = 0;
  const luma = (i: number) => pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114;
  for (let y = 1; y < height; y++) for (let x = 1; x < width; x++) {
    const i = (y * width + x) * 4;
    score += Math.abs(luma(i) - luma(i - 4)) + Math.abs(luma(i) - luma(i - width * 4));
  }
  return score / Math.max(1, (width - 1) * (height - 1));
}
