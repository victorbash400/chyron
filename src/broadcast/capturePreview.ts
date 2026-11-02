interface CaptureHandle {
  handle?: string;
  origin?: string;
}
interface PreviewTrack extends MediaStreamTrack {
  restrictTo: (target: unknown) => Promise<void>;
  getCaptureHandle: () => CaptureHandle | null;
}
interface PreviewMediaDevices extends MediaDevices {
  setCaptureHandleConfig: (config: {
    handle: string;
    exposeOrigin: boolean;
    permittedOrigins: string[];
  }) => void;
}
interface PreviewWindow extends Window {
  RestrictionTarget?: { fromElement: (element: Element) => Promise<unknown> };
}
export function supportsPreviewCapture() {
  return Boolean(
    (window as PreviewWindow).RestrictionTarget &&
    (navigator.mediaDevices as Partial<PreviewMediaDevices>)
      ?.setCaptureHandleConfig &&
    window.MediaRecorder?.isTypeSupported("video/webm;codecs=vp8,opus"),
  );
}
export async function capturePreview(element: HTMLElement) {
  if (!supportsPreviewCapture())
    throw new Error("Browser broadcasting requires desktop Chrome.");
  const handle = crypto.randomUUID();
  const devices = navigator.mediaDevices as PreviewMediaDevices;
  devices.setCaptureHandleConfig({
    handle,
    exposeOrigin: true,
    permittedOrigins: [location.origin],
  });
  const stream = await devices.getDisplayMedia({
    video: { displaySurface: "browser", frameRate: { ideal: 30, max: 30 } },
    audio: false,
    preferCurrentTab: true,
    selfBrowserSurface: "include",
    surfaceSwitching: "exclude",
  } as DisplayMediaStreamOptions);
  try {
    const track = stream.getVideoTracks()[0] as PreviewTrack | undefined;
    const captured = track?.getCaptureHandle?.();
    if (
      !track?.restrictTo ||
      captured?.handle !== handle ||
      captured.origin !== location.origin
    )
      throw new Error("Select this Chyron tab to broadcast the preview.");
    const target = await (
      window as PreviewWindow
    ).RestrictionTarget!.fromElement(element);
    await track.restrictTo(target);
    return stream;
  } catch (error) {
    stream.getTracks().forEach((track) => track.stop());
    throw error;
  }
}
