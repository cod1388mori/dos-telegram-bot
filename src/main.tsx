import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { BrowserRouter } from "react-router-dom";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

function resolveConvexUrl(): string {
  const fromEnv = import.meta.env.VITE_CONVEX_URL as string | undefined;
  if (fromEnv) return fromEnv;
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    // Freebuff/E2B style preview hosts map ports as "<port>-<id>.e2b.app"
    if (/^\d+-/.test(host)) {
      const convexHost = host.replace(/^\d+-/, "3210-");
      return `${window.location.protocol}//${convexHost}`;
    }
    if (host === "localhost" || host === "127.0.0.1") {
      return "http://127.0.0.1:3210";
    }
  }
  return "http://127.0.0.1:3210";
}

const convex = new ConvexReactClient(resolveConvexUrl());

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ConvexAuthProvider client={convex}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ConvexAuthProvider>
  </React.StrictMode>
);
