import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";

export type CameraStatus = "loading" | "live" | "unavailable";

export type CameraErrorReason = "unsupported" | "denied" | "not-found" | "failed";

export type CaptureOverlay = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => void;

export function captureVideoFrame(video: HTMLVideoElement, mirror = true, drawOverlay?: CaptureOverlay): Promise<Blob | null> {
  const w = video.videoWidth;
  const h = video.videoHeight;
  if (!w || !h) return Promise.resolve(null);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.resolve(null);

  if (mirror) {
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, 0, 0, w, h);
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  // overlays (e.g. avatar) are drawn unmirrored, in already-composited canvas space
  drawOverlay?.(ctx, canvas);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.9);
  });
}

export function stopCameraStream(stream: MediaStream | null | undefined) {
  stream?.getTracks().forEach((track) => track.stop());
}

export function useLiveCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>("loading");
  const [errorReason, setErrorReason] = useState<CameraErrorReason | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  const startCamera = useCallback((el: HTMLVideoElement) => {
    stopCameraStream(streamRef.current);
    streamRef.current = null;
    el.srcObject = null;

    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorReason("unsupported");
      setStatus("unavailable");
      return;
    }

    setErrorReason(null);
    setStatus("loading");
    void navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      .then(async (stream) => {
        streamRef.current = stream;
        el.srcObject = stream;
        el.muted = true;
        try {
          await el.play();
          setStatus("live");
        } catch {
          stopCameraStream(stream);
          streamRef.current = null;
          setErrorReason("failed");
          setStatus("unavailable");
        }
      })
      .catch((err: DOMException) => {
        const name = err?.name ?? "";
        if (name === "NotAllowedError" || name === "PermissionDeniedError") {
          setErrorReason("denied");
        } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
          setErrorReason("not-found");
        } else {
          setErrorReason("failed");
        }
        setStatus("unavailable");
      });
  }, []);

  const bindVideo = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el;
    if (!el) {
      stopCameraStream(streamRef.current);
      streamRef.current = null;
      return;
    }
    startCamera(el);
  }, [startCamera]);

  const retry = useCallback(() => {
    setRetryToken((value) => value + 1);
  }, []);

  useEffect(() => {
    if (retryToken === 0) return;
    const el = videoRef.current;
    if (el) startCamera(el);
  }, [retryToken, startCamera]);

  useEffect(() => {
    return () => {
      stopCameraStream(streamRef.current);
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, []);

  const capture = useCallback(async (drawOverlay?: CaptureOverlay) => {
    if (status !== "live" || !videoRef.current) return null;
    return captureVideoFrame(videoRef.current, true, drawOverlay);
  }, [status]);

  return { bindVideo, status, errorReason, retry, capture };
}

export function photoBoothShotStyle(src: string): CSSProperties {
  if (src.startsWith("linear-gradient") || src.startsWith("radial-gradient")) {
    return { background: src };
  }
  return {
    backgroundImage: `url(${src})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };
}
