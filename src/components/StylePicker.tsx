import {
  defaultOverlayDesign,
  overlayStyles,
  type OverlayDesign,
} from "../../shared/overlayDesign.ts";
import type { NewsroomState, Story, OverlayState } from "../../shared/types.ts";
import { sortedStories } from "../../server/ranking.ts";
import StyleCard from "./StyleCard.tsx";
import "./StylePicker.css";
const template: Story = {
  id: "style-template",
  headline: "Headline",
  summary: "",
  status: "BREAKING",
  messageIds: [],
  quoteId: null,
  participants: 0,
  score: 0,
  interest: 0,
  updatedAt: 0,
  createdAt: 0,
  published: false,
  pinned: false,
  dismissed: false,
  edited: false,
};
export default function StylePicker({
  state,
  disabled,
  onChange,
}: {
  state: NewsroomState;
  disabled: boolean;
  onChange: (patch: Partial<OverlayDesign>) => void;
}) {
  const lead =
    sortedStories(state.stories.filter((story) => !story.dismissed))[0] ??
    template;
  return (
    <section
      className="workspace-panel style-picker"
      aria-label="Overlay styles"
    >
      <div className="panel-heading">
        <h2>Styles</h2>
      </div>
      <div className="style-picker-scroll">
        {overlayStyles.map((choice, index) => {
          const design = {
            ...defaultOverlayDesign,
            style: choice.id,
            color: choice.color,
          };
          const sample: OverlayState = {
            mode: "twitch",
            visible: true,
            lead,
            ticker: [lead],
            quote: null,
            design,
          };
          return (
            <StyleCard
              key={choice.id}
              choice={choice}
              index={index}
              selected={state.design.style === choice.id}
              state={sample}
              disabled={disabled}
              onSelect={() =>
                onChange({ style: choice.id, color: choice.color })
              }
            />
          );
        })}
      </div>
    </section>
  );
}
