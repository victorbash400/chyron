import "./AudioTranscript.css";
export default function AudioTranscript({ text }: { text: string }) {
  return (
    <output
      className="audio-transcript"
      aria-label="Latest transcript"
      aria-live="polite"
    >
      {text}
    </output>
  );
}
