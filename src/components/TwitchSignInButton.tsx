import { ArrowUpRight } from "lucide-react";
import "./TwitchSignInButton.css";
export default function TwitchSignInButton({ disabled }: { disabled: boolean }) {
  return <button className="twitch-sign-in" disabled={disabled} onClick={() => location.assign("/api/twitch/connect")}><span>Continue with Twitch</span><ArrowUpRight aria-hidden="true" /></button>;
}
