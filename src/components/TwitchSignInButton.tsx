import "./TwitchSignInButton.css";
export default function TwitchSignInButton({
  disabled,
}: {
  disabled: boolean;
}) {
  return (
    <button
      className="twitch-sign-in"
      disabled={disabled}
      onClick={() => location.assign("/api/twitch/connect")}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">
        <path d="M4 2 2 6v16h6v2l4-2h4l6-6V2H4Zm16 13-4 4h-5l-3 3v-3H5V4h15v11ZM15 7h2v6h-2V7ZM10 7h2v6h-2V7Z" />
      </svg>
      <span>Continue with Twitch</span>
    </button>
  );
}
