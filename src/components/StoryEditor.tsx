import { useState, type FormEvent } from "react";
import type { Story } from "../../shared/types.ts";
import SettingsInlineButton from "./settings/SettingsInlineButton.tsx";
import Dialog from "./Dialog.tsx";
import "./StoryEditor.css";
export default function StoryEditor({
  story,
  onClose,
  onSave,
}: {
  story: Story;
  onClose: () => void;
  onSave: (headline: string, summary: string) => Promise<boolean>;
}) {
  const [headline, setHeadline] = useState(story.headline),
    [summary, setSummary] = useState(story.summary),
    [saving, setSaving] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    const ok = await onSave(headline, summary);
    setSaving(false);
    if (ok) onClose();
  }
  return (
    <Dialog title="Edit story" onClose={onClose}>
      <form className="story-editor" onSubmit={(event) => void submit(event)}>
        <label>
          Headline
          <input
            autoFocus
            value={headline}
            onChange={(event) => setHeadline(event.target.value)}
            required
            maxLength={110}
          />
        </label>
        <label>
          Supporting line
          <textarea
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            maxLength={180}
            rows={3}
          />
        </label>
        <SettingsInlineButton
          primary
          className="story-save"
          disabled={saving || !headline.trim()}
          type="submit"
        >
          {saving ? "Saving" : "Save"}
        </SettingsInlineButton>
      </form>
    </Dialog>
  );
}
