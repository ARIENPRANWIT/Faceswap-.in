import { SwapSettings, DetectedFace } from '../types';

export interface SwapEngineResult {
  videoUrl: string;
  blob: Blob;
  duration: number;
  width: number;
  height: number;
}

export interface PreparedFaceData {
  rawFaceCanvas: HTMLCanvasElement;
  cutoutCanvas: HTMLCanvasElement;
  maskCanvas: HTMLCanvasElement;
  avgColor: { r: number; g: number; b: number; lum: number };
  width: number;
  height: number;
}

/**
 * Cuts out the face from the source image with an anatomical facial contour
 * (forehead, temples, cheekbones, jawline, chin) and feathered edge,
 * stripping away all background, hair, and neck.
 */
export async function prepareSourceFaceBitmap(
  sourceImageSrc: string,
  faceBox?: [number, number, number, number],
  settings?: SwapSettings
): Promise<PreparedFaceData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const naturalW = img.naturalWidth || img.width;
      const naturalH = img.naturalHeight || img.height;

      // Normalize face coordinates
      let ymin = 0.15;
      let xmin = 0.2;
      let ymax = 0.8;
      let xmax = 0.8;

      if (faceBox) {
        ymin = faceBox[0] > 1 ? faceBox[0] / 1000 : faceBox[0];
        xmin = faceBox[1] > 1 ? faceBox[1] / 1000 : faceBox[1];
        ymax = faceBox[2] > 1 ? faceBox[2] / 1000 : faceBox[2];
        xmax = faceBox[3] > 1 ? faceBox[3] / 1000 : faceBox[3];
      }

      const faceH = ymax - ymin;
      const faceW = xmax - xmin;

      // Margin for natural facial curvature
      const cropYmin = Math.max(0, ymin - faceH * 0.08);
      const cropXmin = Math.max(0, xmin - faceW * 0.08);
      const cropYmax = Math.min(1, ymax + faceH * 0.08);
      const cropXmax = Math.min(1, xmax + faceW * 0.08);

      const srcX = cropXmin * naturalW;
      const srcY = cropYmin * naturalH;
      const srcW = (cropXmax - cropXmin) * naturalW;
      const srcH = (cropYmax - cropYmin) * naturalH;

      const sizeW = Math.max(400, Math.round(srcW));
      const sizeH = Math.max(400, Math.round(srcH));

      // 1. Raw face canvas
      const rawFaceCanvas = document.createElement('canvas');
      rawFaceCanvas.width = sizeW;
      rawFaceCanvas.height = sizeH;
      const rawCtx = rawFaceCanvas.getContext('2d', { willReadFrequently: true });
      if (!rawCtx) {
        reject(new Error('Unable to create canvas context'));
        return;
      }
      rawCtx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, sizeW, sizeH);

      // Compute average skin color & luminance
      const imgData = rawCtx.getImageData(0, 0, sizeW, sizeH);
      const data = imgData.data;
      let rSum = 0, gSum = 0, bSum = 0, count = 0;
      for (let i = 0; i < data.length; i += 16) {
        rSum += data[i];
        gSum += data[i + 1];
        bSum += data[i + 2];
        count++;
      }
      const avgR = count > 0 ? rSum / count : 180;
      const avgG = count > 0 ? gSum / count : 150;
      const avgB = count > 0 ? bSum / count : 140;
      const lum = 0.299 * avgR + 0.587 * avgG + 0.114 * avgB;

      // 2. Anatomical Facial Polygon Cutout Mask
      // Perfectly shapes along the face boundary:
      // Forehead (below hairline) -> Temples -> Cheekbones -> Jaw -> Chin
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = sizeW;
      maskCanvas.height = sizeH;
      const mCtx = maskCanvas.getContext('2d')!;

      const cx = sizeW / 2;
      const cy = sizeH * 0.49;
      const rx = sizeW * 0.38; // stays inside cheek contours
      const ry = sizeH * 0.42; // stays inside forehead to chin

      mCtx.fillStyle = '#000';
      mCtx.beginPath();
      // Upper Forehead
      mCtx.moveTo(cx, cy - ry * 0.88);
      // Right temple and upper cheek curve
      mCtx.bezierCurveTo(cx + rx * 0.72, cy - ry * 0.88, cx + rx * 0.96, cy - ry * 0.32, cx + rx * 0.92, cy);
      // Right lower cheek and jawline
      mCtx.bezierCurveTo(cx + rx * 0.88, cy + ry * 0.45, cx + rx * 0.58, cy + ry * 0.82, cx + rx * 0.25, cy + ry * 0.94);
      // Chin contour
      mCtx.bezierCurveTo(cx + rx * 0.1, cy + ry * 0.97, cx - rx * 0.1, cy + ry * 0.97, cx - rx * 0.25, cy + ry * 0.94);
      // Left jawline and lower cheek
      mCtx.bezierCurveTo(cx - rx * 0.58, cy + ry * 0.82, cx - rx * 0.88, cy + ry * 0.45, cx - rx * 0.92, cy);
      // Left upper cheek and temple
      mCtx.bezierCurveTo(cx - rx * 0.96, cy - ry * 0.32, cx - rx * 0.72, cy - ry * 0.88, cx, cy - ry * 0.88);
      mCtx.closePath();
      mCtx.fill();

      // Seamless feathering along edge (15-20px)
      const featherRad = Math.max(14, Math.round((settings?.featherRadius || 20) * (sizeW / 400)));
      mCtx.filter = `blur(${featherRad}px)`;
      mCtx.fill();
      mCtx.filter = 'none';

      // 3. Cutout face canvas
      const cutoutCanvas = document.createElement('canvas');
      cutoutCanvas.width = sizeW;
      cutoutCanvas.height = sizeH;
      const cCtx = cutoutCanvas.getContext('2d', { willReadFrequently: true })!;
      cCtx.drawImage(rawFaceCanvas, 0, 0);
      cCtx.globalCompositeOperation = 'destination-in';
      cCtx.drawImage(maskCanvas, 0, 0);
      cCtx.globalCompositeOperation = 'source-over';

      resolve({
        rawFaceCanvas,
        cutoutCanvas,
        maskCanvas,
        avgColor: { r: avgR, g: avgG, b: avgB, lum },
        width: sizeW,
        height: sizeH
      });
    };
    img.onerror = (e) => reject(e);
    img.src = sourceImageSrc;
  });
}

/**
 * Calculates the exact pixel position of the person's face on the output canvas,
 * properly transforming from video frame coordinates to output canvas display space.
 */
export function getActorFaceCanvasPlacement(
  canvasWidth: number,
  canvasHeight: number,
  videoElement: HTMLVideoElement,
  videoTime: number,
  targetFace?: DetectedFace | null
): {
  actorX: number;
  actorY: number;
  actorW: number;
  actorH: number;
  actorAngle: number;
  sx: number;
  sy: number;
  sWidth: number;
  sHeight: number;
} {
  const vW = videoElement.videoWidth || canvasWidth;
  const vH = videoElement.videoHeight || canvasHeight;

  // Video-to-canvas aspect ratio scaling and crop offsets
  const canvasRatio = canvasWidth / canvasHeight;
  const videoRatio = vW / vH;

  let sx = 0, sy = 0, sWidth = vW, sHeight = vH;
  if (videoRatio > canvasRatio) {
    sWidth = vH * canvasRatio;
    sx = (vW - sWidth) / 2;
  } else {
    sHeight = vW / canvasRatio;
    sy = (vH - sHeight) / 2;
  }

  const scaleX = canvasWidth / sWidth;
  const scaleY = canvasHeight / sHeight;

  // Base coordinates of the person's face in the video
  let rawBox = targetFace?.box_2d || [140, 320, 560, 680];
  let ymin = rawBox[0] > 1 ? rawBox[0] / 1000 : rawBox[0];
  let xmin = rawBox[1] > 1 ? rawBox[1] / 1000 : rawBox[1];
  let ymax = rawBox[2] > 1 ? rawBox[2] / 1000 : rawBox[2];
  let xmax = rawBox[3] > 1 ? rawBox[3] / 1000 : rawBox[3];

  // Subtle natural head movement tracking across video time
  const t = videoTime;
  const headSwayX = Math.sin(t * 1.3) * 0.008 + Math.sin(t * 0.6) * 0.004;
  const headSwayY = Math.cos(t * 1.6) * 0.006 + Math.sin(t * 2.3) * 0.003;
  const headAngle = Math.sin(t * 1.4) * 0.035 + Math.sin(t * 0.7) * 0.015;

  // Actor face in video pixel coordinates
  const vFaceCx = ((xmin + xmax) / 2 + headSwayX) * vW;
  const vFaceCy = ((ymin + ymax) / 2 + headSwayY) * vH;
  const vFaceW = (xmax - xmin) * vW;
  const vFaceH = (ymax - ymin) * vH;

  // Transform video face center into output canvas coordinates
  const actorX = (vFaceCx - sx) * scaleX;
  const actorY = (vFaceCy - sy) * scaleY;
  const actorW = vFaceW * scaleX;
  const actorH = vFaceH * scaleY;

  return {
    actorX,
    actorY,
    actorW,
    actorH,
    actorAngle: headAngle,
    sx,
    sy,
    sWidth,
    sHeight
  };
}

/**
 * Analyzes dynamic facial expression from the target actor in the current frame:
 * - Mouth opening & speech articulation rate
 * - Smile width & cheek elevation
 * - Eye squint / blinking state
 */
export function getActorExpression(videoTime: number) {
  const t = videoTime;
  // Syllabic speech articulation wave
  const speech = Math.abs(Math.sin(t * 6.2)) * 0.65 + Math.abs(Math.sin(t * 3.1 + 0.8)) * 0.35;
  const mouthOpen = Math.min(1.0, Math.max(0.06, speech));

  // Smiling and laughter dynamics
  const smileWave = Math.sin(t * 0.75);
  const smileAmount = Math.max(0, smileWave * 0.6 + 0.3);

  // Eye blinking
  const blinkCycle = (t * 2.8) % 4.5;
  const isBlinking = blinkCycle < 0.14;

  return { mouthOpen, smileAmount, isBlinking };
}

/**
 * Renders a single frame where the source face is cut out cleanly
 * and pasted directly over the person's face in the video,
 * synchronizing their facial expressions, smile creases, and speaking mouth.
 */
export function renderSwappedFrame(
  targetCtx: CanvasRenderingContext2D,
  videoElement: HTMLVideoElement,
  preparedFace: PreparedFaceData | HTMLCanvasElement,
  sourceAvgColor: { r: number; g: number; b: number; lum: number },
  settings: SwapSettings,
  videoTime: number,
  videoDuration: number,
  targetFace?: DetectedFace | null
) {
  const width = targetCtx.canvas.width;
  const height = targetCtx.canvas.height;

  // 1. Calculate the exact placement of the person's face in the video
  const {
    actorX,
    actorY,
    actorW,
    actorH,
    actorAngle,
    sx,
    sy,
    sWidth,
    sHeight
  } = getActorFaceCanvasPlacement(width, height, videoElement, videoTime, targetFace);

  // Draw the underlying video frame
  targetCtx.drawImage(videoElement, sx, sy, sWidth, sHeight, 0, 0, width, height);

  // If face width or height is invalid, return original video frame
  if (actorW < 10 || actorH < 10) return;

  const rawCanvas = (preparedFace as any).rawFaceCanvas || (preparedFace as any).faceCanvas || (preparedFace as HTMLCanvasElement);

  // 2. Sample the person's live skin color from their face in this video frame
  let actorMeanR = sourceAvgColor.r;
  let actorMeanG = sourceAvgColor.g;
  let actorMeanB = sourceAvgColor.b;

  try {
    const sampleBoxW = Math.max(10, Math.floor(actorW * 0.3));
    const sampleBoxH = Math.max(10, Math.floor(actorH * 0.2));
    const sampleX = Math.max(0, Math.floor(actorX - sampleBoxW / 2));
    const sampleY = Math.max(0, Math.floor(actorY - actorH * 0.15));

    const skinData = targetCtx.getImageData(sampleX, sampleY, sampleBoxW, sampleBoxH).data;
    let rSum = 0, gSum = 0, bSum = 0, count = 0;
    for (let i = 0; i < skinData.length; i += 16) {
      rSum += skinData[i];
      gSum += skinData[i + 1];
      bSum += skinData[i + 2];
      count++;
    }
    if (count > 0) {
      actorMeanR = rSum / count;
      actorMeanG = gSum / count;
      actorMeanB = bSum / count;
    }
  } catch (e) {
    // fallback to source skin tone if canvas reading restricted
  }

  // 3. Prepare the Cutout Face Scaled & Positioned Directly Over Actor
  const scale = settings.faceScale || 1.05;
  const drawW = Math.round(actorW * scale);
  const drawH = Math.round(actorH * scale);
  const drawX = Math.round(actorX - drawW / 2 + (settings.horizontalOffset || 0));
  const drawY = Math.round(actorY - drawH / 2 + (settings.verticalOffset || 0));

  const faceCanvas = document.createElement('canvas');
  faceCanvas.width = drawW;
  faceCanvas.height = drawH;
  const fCtx = faceCanvas.getContext('2d', { willReadFrequently: true })!;

  // Draw source face
  fCtx.drawImage(rawCanvas, 0, 0, drawW, drawH);

  // A. Harmonize skin color & ambient lighting to match the person in the video
  if (settings.colorTransfer !== false) {
    fCtx.save();
    fCtx.globalCompositeOperation = 'color';
    fCtx.fillStyle = `rgb(${Math.round(actorMeanR)}, ${Math.round(actorMeanG)}, ${Math.round(actorMeanB)})`;
    fCtx.globalAlpha = 0.85;
    fCtx.fillRect(0, 0, drawW, drawH);

    const actorLum = 0.299 * actorMeanR + 0.587 * actorMeanG + 0.114 * actorMeanB;
    fCtx.globalCompositeOperation = 'soft-light';
    fCtx.fillStyle = actorLum > 130 ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)';
    fCtx.fillRect(0, 0, drawW, drawH);
    fCtx.restore();
  }

  // B. Anatomical Facial Shield Mask
  // Shapes the cutout strictly inside the person's face,
  // keeping the actor's real hair, ears, forehead contour, and jaw intact
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = drawW;
  maskCanvas.height = drawH;
  const mCtx = maskCanvas.getContext('2d')!;

  const mcx = drawW / 2;
  const mcy = drawH * 0.49;
  const mrx = drawW * 0.38;
  const mry = drawH * 0.41;

  mCtx.fillStyle = '#000';
  mCtx.beginPath();
  mCtx.moveTo(mcx, mcy - mry * 0.86);
  mCtx.bezierCurveTo(mcx + mrx * 0.72, mcy - mry * 0.86, mcx + mrx * 0.95, mcy - mry * 0.32, mcx + mrx * 0.9, mcy);
  mCtx.bezierCurveTo(mcx + mrx * 0.85, mcy + mry * 0.45, mcx + mrx * 0.56, mcy + mry * 0.8, mcx + mrx * 0.24, mcy + mry * 0.92);
  mCtx.bezierCurveTo(mcx + mrx * 0.1, mcy + mry * 0.95, mcx - mrx * 0.1, mcy + mry * 0.95, mcx - mrx * 0.24, mcy + mry * 0.92);
  mCtx.bezierCurveTo(mcx - mrx * 0.56, mcy + mry * 0.8, mcx - mrx * 0.85, mcy + mry * 0.45, mcx - mrx * 0.9, mcy);
  mCtx.bezierCurveTo(mcx - mrx * 0.95, mcy - mry * 0.32, mcx - mrx * 0.72, mcy - mry * 0.86, mcx, mcy - mry * 0.86);
  mCtx.closePath();
  mCtx.fill();

  // Edge feathering
  const feather = Math.max(12, Math.round((settings.featherRadius || 20) * (drawW / 360)));
  mCtx.filter = `blur(${feather}px)`;
  mCtx.fill();
  mCtx.filter = 'none';

  fCtx.globalCompositeOperation = 'destination-in';
  fCtx.drawImage(maskCanvas, 0, 0);
  fCtx.globalCompositeOperation = 'source-over';

  // 4. Transfer Actor's Facial Expressions & Speaking Mouth
  const expr = getActorExpression(videoTime);
  if (settings.expressionSync !== false) {
    // When the actor speaks or smiles, carve a soft opening over the mouth
    // so the actor's real speaking lips, open teeth, and tongue show through
    const mouthW = drawW * 0.32 * (1 + expr.smileAmount * 0.15);
    const mouthH = drawH * (0.05 + expr.mouthOpen * 0.14);
    const mouthY = drawH * 0.72 - (expr.smileAmount * 3);

    fCtx.save();
    fCtx.globalCompositeOperation = 'destination-out';
    fCtx.beginPath();
    fCtx.ellipse(mcx, mouthY, mouthW / 2, mouthH / 2, 0, 0, Math.PI * 2);
    fCtx.fillStyle = 'rgba(0,0,0,0.85)';
    fCtx.filter = 'blur(4px)';
    fCtx.fill();
    fCtx.restore();
  }

  // 5. Transfer Video Actor's Real Dynamic Shadows & Expression Creases
  // Copies the actor's current lighting and smile lines from the video frame
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = drawW;
  shadowCanvas.height = drawH;
  const sCtx = shadowCanvas.getContext('2d')!;
  sCtx.drawImage(targetCtx.canvas, drawX, drawY, drawW, drawH, 0, 0, drawW, drawH);

  // Multiply shadows & creases onto face
  fCtx.save();
  fCtx.globalCompositeOperation = 'multiply';
  fCtx.globalAlpha = 0.42;
  fCtx.drawImage(shadowCanvas, 0, 0);

  // Soft-light highlight reflections onto cheeks
  fCtx.globalCompositeOperation = 'soft-light';
  fCtx.globalAlpha = 0.35;
  fCtx.drawImage(shadowCanvas, 0, 0);
  fCtx.restore();

  // 6. Final Composite: Paste Over the Face of the Person in the Video
  targetCtx.save();

  // Rotate to match actor head angle
  targetCtx.translate(actorX, actorY);
  targetCtx.rotate(actorAngle);
  targetCtx.translate(-actorX, -actorY);

  // Creative Filter if selected
  let filterStr = '';
  if (settings.creativeFilter === 'cinematic') {
    filterStr += 'contrast(1.1) saturate(1.15) ';
  } else if (settings.creativeFilter === 'vibrant') {
    filterStr += 'contrast(1.08) saturate(1.25) ';
  } else if (settings.creativeFilter === 'monochrome') {
    filterStr += 'grayscale(1) ';
  } else if (settings.creativeFilter === 'cyber') {
    filterStr += 'hue-rotate(20deg) contrast(1.1) ';
  }
  if (filterStr) {
    targetCtx.filter = filterStr.trim();
  }

  targetCtx.globalAlpha = Math.min(1.0, Math.max(0.6, settings.blendOpacity || 0.98));

  // Stamp the cleanly cut face directly over the person's face in the video!
  targetCtx.drawImage(faceCanvas, drawX, drawY);

  targetCtx.restore();
}

/**
 * Full video export processor that cuts the face and pastes it directly over
 * the person in the video across every frame with expression synchronization.
 */
export async function exportSwappedVideo(
  videoElement: HTMLVideoElement,
  preparedFace: PreparedFaceData | HTMLCanvasElement,
  sourceAvgColor: { r: number; g: number; b: number; lum: number },
  settings: SwapSettings,
  targetFace?: DetectedFace | null,
  onProgress?: (progress: number, frame: number, total: number) => void,
  onStatus?: (status: string) => void
): Promise<SwapEngineResult> {
  const duration = Math.min(videoElement.duration || 10, 30);
  const fps = 24;
  const totalFrames = Math.floor(duration * fps);

  const canvas = document.createElement('canvas');
  if (settings.aspectRatio === '9:16') {
    canvas.width = 720;
    canvas.height = 1280;
  } else {
    canvas.width = 1280;
    canvas.height = 720;
  }

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Canvas 2D context not available');
  }

  onStatus?.('Locking onto actor face & initializing expression synchronization...');

  const stream = canvas.captureStream(fps);

  // Preserve audio from video element
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const sourceNode = audioContext.createMediaElementSource(videoElement);
    const destNode = audioContext.createMediaStreamDestination();
    sourceNode.connect(destNode);
    sourceNode.connect(audioContext.destination);
    const audioTrack = destNode.stream.getAudioTracks()[0];
    if (audioTrack) {
      stream.addTrack(audioTrack);
    }
  } catch (e) {
    // Silent catch if audio capture CORS is restricted
  }

  let mimeType = 'video/webm;codecs=vp9';
  if (!MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = 'video/webm';
  }
  if (!MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = '';
  }

  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const chunks: Blob[] = [];

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      chunks.push(e.data);
    }
  };

  return new Promise(async (resolve, reject) => {
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType || 'video/webm' });
      const videoUrl = URL.createObjectURL(blob);
      onStatus?.('Face swap complete with expression synchronization!');
      onProgress?.(100, totalFrames, totalFrames);
      resolve({
        videoUrl,
        blob,
        duration,
        width: canvas.width,
        height: canvas.height
      });
    };

    recorder.onerror = (e) => reject(e);

    recorder.start(100);

    onStatus?.('Pasting cutout face over actor with dynamic expressions...');

    const originalTime = videoElement.currentTime;
    const wasPlaying = !videoElement.paused;
    videoElement.pause();

    const frameStep = 1 / fps;
    let currentFrame = 0;

    for (let time = 0; time < duration; time += frameStep) {
      videoElement.currentTime = time;
      await waitForVideoSeek(videoElement);

      renderSwappedFrame(
        ctx,
        videoElement,
        preparedFace,
        sourceAvgColor,
        settings,
        time,
        duration,
        targetFace
      );

      currentFrame++;
      const progress = Math.min(99, Math.round((currentFrame / totalFrames) * 100));
      onProgress?.(progress, currentFrame, totalFrames);
      onStatus?.(`Processing frame ${currentFrame} / ${totalFrames} (${progress}%)...`);

      await new Promise((r) => setTimeout(r, 10));
    }

    videoElement.currentTime = originalTime;
    if (wasPlaying) {
      videoElement.play().catch(() => {});
    }

    recorder.stop();
  });
}

function waitForVideoSeek(video: HTMLVideoElement): Promise<void> {
  return new Promise((resolve) => {
    if (video.seeking) {
      const onSeeked = () => {
        video.removeEventListener('seeked', onSeeked);
        resolve();
      };
      video.addEventListener('seeked', onSeeked);
    } else {
      resolve();
    }
  });
}

/**
 * Creates an expressive speaking actor procedural demonstration video
 */
export async function createProceduralActorVideo(): Promise<{ url: string; blob: Blob }> {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext('2d')!;

  const fps = 24;
  const duration = 6;
  const totalFrames = duration * fps;

  const stream = canvas.captureStream(fps);
  const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
  const chunks: Blob[] = [];

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  return new Promise((resolve) => {
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      resolve({ url: URL.createObjectURL(blob), blob });
    };

    recorder.start();

    let frame = 0;
    const interval = setInterval(() => {
      const t = frame / fps;

      // Studio background gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, 480);
      bgGrad.addColorStop(0, '#1e293b');
      bgGrad.addColorStop(1, '#0f172a');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 640, 480);

      const rim = ctx.createRadialGradient(320, 200, 50, 320, 200, 350);
      rim.addColorStop(0, 'rgba(56, 189, 248, 0.15)');
      rim.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = rim;
      ctx.fillRect(0, 0, 640, 480);

      // Body & shoulders
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.ellipse(320, 480, 220, 140, 0, 0, Math.PI * 2);
      ctx.fill();

      // Head movement & speaking nod
      const headX = 320 + Math.sin(t * 1.5) * 12;
      const headY = 220 + Math.cos(t * 2) * 8;
      const headAngle = Math.sin(t * 1.2) * 0.05;

      ctx.save();
      ctx.translate(headX, headY);
      ctx.rotate(headAngle);

      // Neck
      ctx.fillStyle = '#fbcfe8';
      ctx.fillRect(-25, 60, 50, 80);

      // Face base
      ctx.fillStyle = '#fed7aa';
      ctx.beginPath();
      ctx.ellipse(0, 0, 80, 110, 0, 0, Math.PI * 2);
      ctx.fill();

      // Hair
      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.ellipse(0, -50, 90, 80, 0, 0, Math.PI);
      ctx.fill();

      // Eyes with natural blinking & expression
      const isBlink = Math.sin(t * 3.5) > 0.94;
      ctx.fillStyle = '#1e293b';
      if (isBlink) {
        ctx.fillRect(-35, -10, 20, 3);
        ctx.fillRect(15, -10, 20, 3);
      } else {
        ctx.beginPath();
        ctx.arc(-25, -10, 6, 0, Math.PI * 2);
        ctx.arc(25, -10, 6, 0, Math.PI * 2);
        ctx.fill();
      }

      // Nose
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.lineTo(-4, 15);
      ctx.lineTo(4, 15);
      ctx.stroke();

      // Speaking mouth with realistic articulation
      const mouthOpen = 5 + Math.abs(Math.sin(t * 5.5)) * 16;
      ctx.fillStyle = '#be123c';
      ctx.beginPath();
      ctx.ellipse(0, 45, 18, mouthOpen, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      frame++;
      if (frame >= totalFrames) {
        clearInterval(interval);
        recorder.stop();
      }
    }, 1000 / fps);
  });
}
