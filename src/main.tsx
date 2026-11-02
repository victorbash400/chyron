import "@fontsource/barlow-condensed/latin-500.css";
import "@fontsource/barlow-condensed/latin-600.css";
import "@fontsource/barlow-condensed/latin-800.css";
import "@fontsource/barlow-condensed/latin-800-italic.css";
import React, { lazy, Suspense } from "react";
import { createRoot, type Root } from "react-dom/client";
import LoadingRegion from "./components/controls/LoadingRegion.tsx";
import ApplicationErrorBoundary from "./components/ApplicationErrorBoundary.tsx";
import OverlayPage from "./components/OverlayPage.tsx";
import "./global.css";
const SessionGate = lazy(() => import("./components/SessionGate.tsx"));
const overlayToken = location.pathname.startsWith("/overlay/")
  ? location.pathname.split("/")[2]
  : null;
const container = document.getElementById("root")!;
let root: Root;
if (import.meta.hot) {
  root = import.meta.hot.data.root ?? createRoot(container);
  import.meta.hot.data.root = root;
} else {
  root = createRoot(container);
}
root.render(
  <React.StrictMode>
    <ApplicationErrorBoundary>
      {overlayToken ? (
        <OverlayPage token={overlayToken} />
      ) : (
        <Suspense fallback={<LoadingRegion label="Loading Chyron" />}>
          <SessionGate />
        </Suspense>
      )}
    </ApplicationErrorBoundary>
  </React.StrictMode>,
);
