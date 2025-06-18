import App from "@/renderer/app/page";
import { Suspense } from "react";
import { createRoot } from "react-dom/client";
import ErrorBoundary from "./error-boundary";
import Loading from "./loading";

const root = createRoot(document.body);

root.render(
  <ErrorBoundary>
    <Suspense fallback={<Loading />}>
      <App />
    </Suspense>
  </ErrorBoundary>
);
