import { createRoot } from "react-dom/client";
import BootstrapWrapper from "./bootstrap-wrapper";
import Page from "./page";
import ErrorBoundary from "./error-boundary";

const root = createRoot(document.body);

root.render(
  <ErrorBoundary>
    <BootstrapWrapper>
      <Page />
    </BootstrapWrapper>
  </ErrorBoundary>
);
