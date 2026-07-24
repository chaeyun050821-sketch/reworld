import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";

export type CameraStatus = "loading" | "live" | "unavailable";

export function captureVideoFrame(video: HTMLVideoElement, mirror = true): Promise<Blob | null> {
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

  const bindVideo = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el;
    stopCameraStream(streamRef.current);
    streamRef.current = null;

    if (!el) return;

    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("unavailable");
      return;
    }

    setStatus("loading");
    void navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      .then(async (stream) => {
        streamRef.current = stream;
        el.srcObject = stream;
        try {
          await el.play();
          setStatus("live");
        } catch {
          stopCameraStream(stream);
          streamRef.current = null;
          setStatus("unavailable");
        }
      })
      .catch(() => setStatus("unavailable"));
  }, []);

  useEffect(() => {
    return () => {
      stopCameraStream(streamRef.current);
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, []);

  const capture = useCallback(async () => {
    if (status !== "live" || !videoRef.current) return null;
    return captureVideoFrame(videoRef.current);
  }, [status]);

  return { bindVideo, status, capture };
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
