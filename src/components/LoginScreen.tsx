import ChyronBrand from "./ChyronBrand.tsx";
import TwitchSignInButton from "./TwitchSignInButton.tsx";
import LoginPreview from "./LoginPreview.tsx";
import "./LoginScreen.css";
export default function LoginScreen({ configured }: { configured: boolean }) {
  return (
    <main className="login-screen">
      <div className="login-layout">
        <section className="login-controls" aria-label="Sign in">
          <ChyronBrand />
          <div className="login-message">
            <h1>See what chat is talking about</h1>
            <p>AI chat summaries for streamers.</p>
          </div>
          <TwitchSignInButton disabled={!configured} />
          {!configured && <span role="alert">Twitch sign-in unavailable.</span>}
        </section>
        <LoginPreview />
      </div>
    </main>
  );
}
