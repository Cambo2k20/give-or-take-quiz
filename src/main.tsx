import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/fraunces";
import "@fontsource-variable/nunito";
import Game from "./Game";
import "./globals.css";

const container = document.getElementById("root");

if (!container) {
  throw new Error("Missing #root container in index.html.");
}

createRoot(container).render(
  <StrictMode>
    <Game />
  </StrictMode>,
);
