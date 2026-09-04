import React from "react";
import ReactDOM from "react-dom/client";
import { GlassSystemProvider } from "open-glass-ui";
import "open-glass-ui/styles.css";
import "./index.css";
import App from "./App";

document.addEventListener(
  "wheel",
  (event) => {
    if (event.ctrlKey) {
      event.preventDefault();
    }
  },
  { passive: false }
);

document.addEventListener("keydown", (event) => {
  if (
    event.ctrlKey &&
    ["+", "-", "=", "0"].includes(event.key)
  ) {
    event.preventDefault();
  }
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <GlassSystemProvider
      renderer="auto"
      theme={{
        appearance: "light",
        theme: {
          preset: "cobalt",
          radius: "balanced",
        },
      }}
    >
      <App />
    </GlassSystemProvider>
  </React.StrictMode>
);