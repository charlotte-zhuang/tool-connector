import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircleIcon } from "lucide-react";
import * as React from "react";

type Props = { children: React.ReactNode };
type State = { errorMessage: string | null };

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { errorMessage: null };
  }

  static getDerivedStateFromError(error: unknown): State {
    return {
      errorMessage:
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof error.message === "string"
          ? error.message
          : typeof error === "string"
          ? error
          : "Unknown error",
    };
  }

  override render() {
    if (this.state.errorMessage === null) {
      return this.props.children;
    }

    return (
      <div className="flex flex-col space-y-3">
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertTitle>
            Oops! Tool Connector encountered an unexpected error.
          </AlertTitle>
          <AlertDescription>
            <p>You can try restarting the app to fix this. Details:</p>
            {this.state.errorMessage}
          </AlertDescription>
        </Alert>
      </div>
    );
  }
}
