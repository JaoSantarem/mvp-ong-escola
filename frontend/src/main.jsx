import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles/global.css";
import "./styles/design.css";
import "./styles/inverso.css";
import "./styles/interactions.css";

createRoot(document.getElementById("root")).render(<App />);
