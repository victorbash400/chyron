import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useNarrowLayout } from "./state/useNarrowLayout.ts";
import { useWorkspaceNavigation } from "./state/useWorkspaceNavigation.ts";
import LoadingRegion from "./components/controls/LoadingRegion.tsx";
import NewsroomControls from "./components/NewsroomControls.tsx";
import type { Story } from "../shared/types.ts";
import { useNewsroom } from "./state/useNewsroom.ts";
import LibrarySidebar from "./components/LibrarySidebar.tsx";
import WorkspaceShell from "./components/WorkspaceShell.tsx";
import ChannelHeader from "./components/ChannelHeader.tsx";
import StylePicker from "./components/StylePicker.tsx";
import StoryList from "./components/StoryList.tsx";
import OverlayPreview from "./components/OverlayPreview.tsx";
import ChatFeed from "./components/ChatFeed.tsx";
import ErrorNotice from "./components/ErrorNotice.tsx";
const AppearancePage = lazy(() => import("./components/AppearancePage.tsx"));
const StoryEditor = lazy(() => import("./components/StoryEditor.tsx"));
const StoryEvidence = lazy(() => import("./components/StoryEvidence.tsx"));
const TwitchSetup = lazy(() => import("./components/TwitchSetup.tsx"));

export default function App() {
  const room = useNewsroom();
  const chatTrigger = useRef<HTMLButtonElement>(null);
  const [editing, setEditing] = useState<Story | null>(null),
    [evidence, setEvidence] = useState<Story | null>(null),
    [setup, setSetup] = useState(false);
  const narrow = useNarrowLayout();
  const [stylesOpen, setStylesOpen] = useState(false);
  const [requestedChat, setChatOpen] = useState<boolean>();
  const chatOpen = requestedChat ?? !narrow;
  const navigation = useWorkspaceNavigation();
  const onDesign = room.updateDesign;
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
        stylesOpen={stylesOpen}
        chatOpen={chatOpen}
        settings={
          navigation.settings ? (
            <Suspense fallback={<LoadingRegion label="Loading appearance" />}>
              <AppearancePage state={state} busy={false} onChange={onDesign} />
            </Suspense>
          ) : undefined
        }
        header={
          <ChannelHeader
            chatTrigger={chatTrigger}
            onStyles={() => setStylesOpen(true)}
            chatOpen={chatOpen}
            onChat={() => setChatOpen(navigation.settings || !chatOpen)}
            settings={navigation.settings}
            onNavigate={navigation.navigate}
            state={state}
            busy={room.pending}
            onReconnect={() => void act("/api/twitch/reconnect")}
            onDisconnect={() => void act("/api/twitch/disconnect")}
            onSetup={() =>
              twitchConfigured
                ? location.assign("/api/twitch/connect")
                : setSetup(true)
            }
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
              onChange={onDesign}
            />
          </LibrarySidebar>
        }
        controls={
          <NewsroomControls
            state={state}
            url={overlayUrl}
            busy={room.pending}
            onSettings={(patch) => void act("/api/settings", patch)}
            onMode={(mode) => void act("/api/mode", { mode })}
            onScenario={(scenario) => void act("/api/simulation", { scenario })}
            onError={room.setError}
          />
        }
        stories={
          <StoryList
            stories={state.stories}
            working={state.working}
            canGenerate={!state.paused && state.messages.length > 0}
            onGenerate={() => void act("/api/coverage")}
            busy={room.pending}
            onAction={(id, action) =>
              void act(`/api/stories/${id}`, { action })
            }
            onEdit={setEditing}
            onEvidence={setEvidence}
          />
        }
        preview={
          <OverlayPreview
            state={state}
            url={overlayUrl}
            busy={room.pending}
            onSettings={(patch) => void act("/api/settings", patch)}
            onError={room.setError}
          />
        }
        chat={
          <ChatFeed
            open={chatOpen && !navigation.settings}
            onClose={() => {
              setChatOpen(false);
              chatTrigger.current?.focus();
            }}
            state={state}
            busy={room.pending}
            onMessage={(author, text) =>
              act("/api/simulation/message", { author, text })
            }
          />
        }
      />
      <Suspense fallback={<LoadingRegion label="Loading editor" overlay />}>
        {editing && (
          <StoryEditor
            story={editing}
            onClose={() => setEditing(null)}
            onSave={(headline, summary) =>
              act(`/api/stories/${editing.id}`, {
                action: "edit",
                headline,
                summary,
              })
            }
          />
        )}{" "}
        {evidence && (
          <StoryEvidence
            story={evidence}
            messages={state.messages}
            onClose={() => setEvidence(null)}
          />
        )}{" "}
        {setup && (
          <TwitchSetup
            onClose={() => setSetup(false)}
            onSave={(clientId, clientSecret) =>
              act("/api/twitch/configure", { clientId, clientSecret })
            }
          />
        )}
      </Suspense>
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
