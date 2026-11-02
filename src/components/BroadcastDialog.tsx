import { useEffect, useState } from "react";
import type { BroadcastAccess } from "../../shared/broadcast.ts";
import { api } from "../state/api.ts";
import { supportsPreviewCapture } from "../broadcast/capturePreview.ts";
import Dialog from "./Dialog.tsx";
import SettingsGroup from "./settings/SettingsGroup.tsx";
import SettingsRow from "./settings/SettingsRow.tsx";
import SettingsInlineButton from "./settings/SettingsInlineButton.tsx";
import ToggleSwitch from "./controls/ToggleSwitch.tsx";
import LoadingRegion from "./controls/LoadingRegion.tsx";
import "./BroadcastDialog.css";
export default function BroadcastDialog({
  hasVideo,
  opening,
  onSource,
  onClose,
  onStart,
}: {
  hasVideo: boolean;
  opening: boolean;
  onSource: (source: "camera" | "screen") => void;
  onClose: () => void;
  onStart: (microphone: boolean, test: boolean) => void;
}) {
  const [access, setAccess] = useState<BroadcastAccess | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [microphone, setMicrophone] = useState(false);
  const [test, setTest] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const supported = supportsPreviewCapture();
  useEffect(() => {
    let active = true;
    void api<BroadcastAccess>("/api/broadcast")
      .then((value) => {
        if (active) {
          setAccess(value);
          setError(null);
        }
      })
      .catch((error) => {
        if (active) setError(error.message);
      });
    return () => {
      active = false;
    };
  }, [attempt]);
  return (
    <Dialog title="Broadcast" onClose={onClose}>
      <div className="broadcast-dialog">
        {!supported ? (
          <span role="alert">Use desktop Chrome for browser broadcasting.</span>
        ) : error ? (
          <div className="broadcast-dialog-error">
            <span role="alert">{error}</span>
            <SettingsInlineButton
              onClick={() => setAttempt((value) => value + 1)}
            >
              Retry
            </SettingsInlineButton>
          </div>
        ) : !access ? (
          <LoadingRegion label="Loading broadcast settings" />
        ) : !access.configured ? (
          <span role="alert">Browser broadcasting is unavailable.</span>
        ) : !access.authorized ? (
          <SettingsInlineButton
            primary
            onClick={() => location.assign("/api/twitch/connect?broadcast=1")}
          >
            Authorize Twitch broadcasting
          </SettingsInlineButton>
        ) : (
          <>
            <SettingsGroup>
              {!hasVideo && (
                <SettingsRow label="Video">
                  <SettingsInlineButton
                    disabled={opening}
                    onClick={() => onSource("camera")}
                  >
                    Camera
                  </SettingsInlineButton>
                  <SettingsInlineButton
                    disabled={opening}
                    onClick={() => onSource("screen")}
                  >
                    Screen
                  </SettingsInlineButton>
                </SettingsRow>
              )}
              <SettingsRow label="Microphone">
                <ToggleSwitch
                  label="Broadcast microphone"
                  checked={microphone}
                  onChange={setMicrophone}
                />
              </SettingsRow>
              <SettingsRow label="Bandwidth test">
                <ToggleSwitch
                  label="Bandwidth test without going live"
                  checked={test}
                  onChange={setTest}
                />
              </SettingsRow>
            </SettingsGroup>
            <div className="broadcast-dialog-actions">
              <SettingsInlineButton
                primary
                disabled={!hasVideo || opening}
                onClick={() => onStart(microphone, test)}
              >
                {test ? "Start test" : "Go live"}
              </SettingsInlineButton>
            </div>
          </>
        )}
      </div>
    </Dialog>
  );
}
