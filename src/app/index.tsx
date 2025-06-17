import { createRoot } from "react-dom/client";

import "./index.css";

const root = createRoot(document.body);

root.render(
  <div>
    <h2>Hello from React!</h2>
    <button
      onClick={() => {
        window.electronAPI
          .getConfigs()
          .then((configs) => window.electronAPI.setConfigs(configs));
      }}
    >
      click
    </button>
  </div>
);
