import SettingsInlineButton from "./settings/SettingsInlineButton.tsx";
import "./SimulationScenarios.css";

export default function SimulationScenarios({
  busy,
  onScenario,
}: {
  busy: boolean;
  onScenario: (scenario: string) => void;
}) {
  return (
    <div className="simulation-scenarios">
      <SettingsInlineButton
        disabled={busy}
        onClick={() => onScenario("keyboard")}
      >
        Keyboard debate
      </SettingsInlineButton>
      <SettingsInlineButton
        disabled={busy}
        onClick={() => onScenario("reversal")}
      >
        Plot twist
      </SettingsInlineButton>
    </div>
  );
}
