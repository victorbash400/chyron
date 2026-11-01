import { useState } from "react";
import type { Story } from "../shared/types.ts";
import { useNewsroom } from "./state/useNewsroom.ts";
import WorkspaceShell from "./components/WorkspaceShell.tsx";
import ChannelHeader from "./components/ChannelHeader.tsx";
import NewsroomControls from "./components/NewsroomControls.tsx";
import StoryList from "./components/StoryList.tsx";
import OverlayPreview from "./components/OverlayPreview.tsx";
import ChatFeed from "./components/ChatFeed.tsx";
import ErrorNotice from "./components/ErrorNotice.tsx";
import StoryEditor from "./components/StoryEditor.tsx";
import StoryEvidence from "./components/StoryEvidence.tsx";
import TwitchSetup from "./components/TwitchSetup.tsx";
export default function App() {
  const room = useNewsroom();
  const [editing, setEditing] = useState<Story | null>(null),
    [evidence, setEvidence] = useState<Story | null>(null),
    [setup, setSetup] = useState(false);
  const bootstrap = room.bootstrap;
  const act = room.act;
  if (!bootstrap)
    return room.error ? (
      <ErrorNotice error={room.error} onRetry={room.reconnect} />
    ) : (
      <div role="status" aria-label="Loading Chyron" />
    );
  const { state, overlayUrl, twitchConfigured } = bootstrap;
  return (
    <>
      <WorkspaceShell
        header={
          <ChannelHeader
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
        notice={
          (room.error || state.error) && (
            <ErrorNotice
              error={room.error ?? state.error!}
              onRetry={
                !room.online ? room.reconnect : () => void act("/api/coverage")
              }
            />
          )
        }
        toolbar={
          <NewsroomControls
            state={state}
            busy={room.pending}
            onSettings={(patch) => void act("/api/settings", patch)}
            onGenerate={() => void act("/api/coverage")}
            onMode={(mode) => void act("/api/mode", { mode })}
          />
        }
        stories={
          <StoryList
            stories={state.stories}
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
            onError={room.setError}
          />
        }
        chat={
          <ChatFeed
            state={state}
            busy={room.pending}
            onScenario={(scenario) => void act("/api/simulation", { scenario })}
            onMessage={(author, text) =>
              act("/api/simulation/message", { author, text })
            }
            onError={room.setError}
          />
        }
      />
      {editing && (
        <StoryEditor
          story={editing}
          error={room.error}
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
          error={room.error}
          onClose={() => setSetup(false)}
          onSave={(clientId, clientSecret) =>
            act("/api/twitch/configure", { clientId, clientSecret })
          }
        />
      )}
    </>
  );
}
