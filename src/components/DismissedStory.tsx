import type { Story } from "../../shared/types.ts";
import SettingsInlineButton from "./settings/SettingsInlineButton.tsx";
import "./DismissedStory.css";
export default function DismissedStory({
  story,
  busy,
  onRestore,
}: {
  story: Story;
  busy: boolean;
  onRestore: () => void;
}) {
  return (
    <article className="dismissed-story">
      <span>{story.headline}</span>
      <SettingsInlineButton disabled={busy} onClick={onRestore}>
        Restore
      </SettingsInlineButton>
    </article>
  );
}
