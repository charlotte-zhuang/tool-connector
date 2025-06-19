import { Suspense } from "react";
import { createRoot } from "react-dom/client";
import ErrorBoundary from "./error-boundary";
import Loading from "./loading";
import App from "./page";

const root = createRoot(document.body);

root.render(
  <ErrorBoundary>
    <Suspense fallback={<Loading />}>
      <App />
    </Suspense>
  </ErrorBoundary>
);
