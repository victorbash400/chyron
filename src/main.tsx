import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import OverlayPage from "./components/OverlayPage.tsx";
import "./global.css";
const overlayToken = location.pathname.startsWith("/overlay/")
  ? location.pathname.split("/")[2]
  : null;
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {overlayToken ? <OverlayPage token={overlayToken} /> : <App />}
  </React.StrictMode>,
);
