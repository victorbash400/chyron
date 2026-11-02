import { useEffect, useState } from "react";
import type { SessionStatus } from "../../shared/session.ts";
import { api } from "../state/api.ts";
import App from "../App.tsx";
import LoginScreen from "./LoginScreen.tsx";
import ErrorNotice from "./ErrorNotice.tsx";
import LoadingRegion from "./controls/LoadingRegion.tsx";
export default function SessionGate() {
  const [session, setSession] = useState<SessionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    void api<SessionStatus>("/api/session")
      .then((value) => {
        if (active) {
          setSession(value);
          setError(null);
        }
      })
      .catch((error) => {
        if (active) setError(error.message);
      });
    const expired = () =>
      setSession(
        (previous) => previous && { ...previous, account: null, local: false },
      );
    window.addEventListener("chyron:session-expired", expired);
    return () => {
      active = false;
      window.removeEventListener("chyron:session-expired", expired);
    };
  }, [attempt]);
  if (!session)
    return error ? (
      <ErrorNotice
        error={error}
        onRetry={() => setAttempt((value) => value + 1)}
        retryLabel="Retry"
      />
    ) : (
      <LoadingRegion label="Loading Chyron" />
    );
  if (!session.account && !session.local)
    return <LoginScreen configured={session.canSignIn} />;
  return (
    <App
      account={session.account}
      onLogout={async () => {
        await api("/api/auth/logout", {});
        setSession({ ...session, account: null, local: false });
      }}
    />
  );
}
