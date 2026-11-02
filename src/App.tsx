import { useBroadcastAudio } from "./broadcast/useBroadcastAudio.ts";
import { lazy, Suspense, useEffect, useState } from "react";
import { useWorkspaceNavigation } from "./state/useWorkspaceNavigation.ts";
import { useNewsroom } from "./state/useNewsroom.ts";
import type { StreamerAccount } from "../shared/session.ts";
import type { Story } from "../shared/types.ts";
import LoadingRegion from "./components/controls/LoadingRegion.tsx";
import NewsroomControls from "./components/NewsroomControls.tsx";
import LibrarySidebar from "./components/LibrarySidebar.tsx";
import WorkspaceShell from "./components/WorkspaceShell.tsx";
import WorkspaceRail from "./components/WorkspaceRail.tsx";
import ChannelHeader from "./components/ChannelHeader.tsx";
import StylePicker from "./components/StylePicker.tsx";
import StoryList from "./components/StoryList.tsx";
import OverlayPreview from "./components/OverlayPreview.tsx";
import ChatFeed from "./components/ChatFeed.tsx";
import AccountPanel from "./components/AccountPanel.tsx";
import LogoutDialog from "./components/LogoutDialog.tsx";
import ErrorNotice from "./components/ErrorNotice.tsx";
const NewsSettingsPage = lazy(
  () => import("./components/NewsSettingsPage.tsx"),
);
const AppearancePage = lazy(() => import("./components/AppearancePage.tsx"));
const StoryEvidence = lazy(() => import("./components/StoryEvidence.tsx"));

export default function App({
  account,
  onLogout,
}: {
  account: StreamerAccount | null;
  onLogout: () => Promise<void>;
}) {
  const [loggingOut, setLoggingOut] = useState(false);
  const room = useNewsroom();
  const [broadcastAudio, setBroadcastAudio] = useState<MediaStream | null>(
    null,
  );
  useBroadcastAudio(
    broadcastAudio,
    room.bootstrap?.state.sourceId ?? "",
    !room.bootstrap ||
      room.bootstrap.state.paused ||
      !room.bootstrap.state.coverage.includeAudio,
    room.setError,
  );
  const navigation = useWorkspaceNavigation();
  const [evidence, setEvidence] = useState<Story | null>(null);
  const [stylesOpen, setStylesOpen] = useState(false);
  const [logout, setLogout] = useState(false);
  const [dismissedError, setDismissedError] = useState<string | null>(null);
  useEffect(() => setDismissedError(null), [room.bootstrap?.state.error]);
  const bootstrap = room.bootstrap;
  const act = room.act;
  if (!bootstrap)
    return room.error ? (
      <ErrorNotice
        error={room.error}
        onRetry={room.reconnect}
        retryLabel="Reconnect"
      />
    ) : (
      <LoadingRegion label="Loading Chyron" />
    );
  const { state, overlayUrl, twitchConfigured } = bootstrap;
  return (
    <>
      <WorkspaceShell
        header={
          <ChannelHeader
            panel={navigation.panel}
            onPanel={navigation.toggle}
            onStyles={() => setStylesOpen(true)}
          />
        }
        styles={
          <LibrarySidebar
            open={stylesOpen}
            onClose={() => setStylesOpen(false)}
          >
            <StylePicker
              design={state.design}
              disabled={false}
              onChange={room.updateDesign}
            />
          </LibrarySidebar>
        }
        preview={
          <OverlayPreview
            onBroadcastAudio={setBroadcastAudio}
            state={state}
            url={overlayUrl}
            busy={room.pending}
            onSettings={(patch) => void act("/api/settings", patch)}
            onError={room.setError}
          />
        }
        stories={
          <StoryList
            stories={state.stories}
            working={state.working}
            busy={room.pending}
            onAction={(id, action) =>
              void act(`/api/stories/${id}`, { action })
            }
            onEvidence={setEvidence}
          />
        }
        sidebar={
          <WorkspaceRail
            panel={navigation.panel}
            onClose={() => navigation.navigate(null)}
            controls={
              <NewsroomControls
                broadcastAudioActive={Boolean(broadcastAudio)}
                state={state}
                url={overlayUrl}
                busy={room.pending}
                onSimulate={(settings) =>
                  act("/api/simulation/start", settings)
                }
                onStopSimulation={() => void act("/api/simulation/stop")}
                onSettings={(patch) => void act("/api/settings", patch)}
                onMode={(mode) => void act("/api/mode", { mode })}
                onError={room.setError}
              />
            }
            settings={
              <Suspense fallback={<LoadingRegion label="Loading settings" />}>
                {navigation.section === "news" ? (
                  <NewsSettingsPage
                    settings={state.coverage}
                    models={bootstrap.coverageModels}
                    disabled={room.pending || state.working}
                    onChange={(coverage) =>
                      void act("/api/settings", { coverage })
                    }
                    onNavigate={(section) =>
                      navigation.navigate("settings", section)
                    }
                  />
                ) : (
                  <AppearancePage
                    state={state}
                    busy={room.pending}
                    onChange={room.updateDesign}
                    onNavigate={(section) =>
                      navigation.navigate("settings", section)
                    }
                  />
                )}
              </Suspense>
            }
            chat={
              <ChatFeed
                open={navigation.panel === "chat"}
                onClose={() => navigation.navigate(null)}
                state={state}
                busy={room.pending}
                onMessage={(author, text) =>
                  act("/api/simulation/message", { author, text })
                }
              />
            }
            account={
              <AccountPanel
                account={account}
                state={state}
                busy={room.pending}
                configured={twitchConfigured}
                onConnect={() => location.assign("/api/twitch/connect")}
                onReconnect={() => void act("/api/twitch/reconnect")}
                onDisconnect={() => void act("/api/twitch/disconnect")}
                onLogout={() => setLogout(true)}
              />
            }
          />
        }
      />
      <Suspense fallback={<LoadingRegion label="Loading details" overlay />}>
        {evidence && (
          <StoryEvidence
            story={evidence}
            messages={state.messages}
            onClose={() => setEvidence(null)}
          />
        )}
      </Suspense>
      {logout && (
        <LogoutDialog
          busy={loggingOut}
          onClose={() => setLogout(false)}
          onConfirm={() => {
            setLoggingOut(true);
            void onLogout()
              .catch((error) => room.setError(error.message))
              .finally(() => setLoggingOut(false));
          }}
        />
      )}
      {(room.error || (state.error !== dismissedError && state.error)) && (
        <ErrorNotice
          error={room.error ?? state.error!}
          onDismiss={() => {
            setDismissedError(state.error);
            room.setError(null);
          }}
          onRetry={!room.online ? room.reconnect : undefined}
          retryLabel="Reconnect"
        />
      )}
    </>
  );
}
