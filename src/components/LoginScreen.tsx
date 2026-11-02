import ChyronBrand from "./ChyronBrand.tsx";
import TwitchSignInButton from "./TwitchSignInButton.tsx";
import "./LoginScreen.css";
export default function LoginScreen({ configured }: { configured: boolean }) {
  return <main className="login-screen"><section className="login-controls" aria-label="Sign in"><ChyronBrand /><TwitchSignInButton disabled={!configured} />{!configured && <span role="alert">Twitch sign-in unavailable.</span>}</section></main>;
}
