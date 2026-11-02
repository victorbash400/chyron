import SettingsPicker from "./SettingsPicker.tsx";
export type SettingsSection = "appearance" | "news";
export default function SettingsNavigation({
  section,
  onChange,
}: {
  section: SettingsSection;
  onChange: (section: SettingsSection) => void;
}) {
  return (
    <SettingsPicker
      label="Settings section"
      value={section}
      options={[
        { value: "appearance", label: "Appearance" },
        { value: "news", label: "News controls" },
      ]}
      onChange={onChange}
    />
  );
}
