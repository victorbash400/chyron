import { useRef } from "react";
import { Upload } from "lucide-react";
import IconButton from "./controls/IconButton.tsx";
export default function AudioFileButton({
  disabled,
  onFile,
}: {
  disabled: boolean;
  onFile: (file: File) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={input}
        type="file"
        accept="audio/wav,audio/webm,audio/mp4,audio/mpeg,audio/ogg"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
          event.target.value = "";
        }}
      />
      <IconButton
        label="Transcribe audio file"
        disabled={disabled}
        onClick={() => input.current?.click()}
      >
        <Upload />
      </IconButton>
    </>
  );
}
