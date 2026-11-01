import { Component, type ReactNode } from "react";
import ErrorNotice from "./ErrorNotice.tsx";

export default class ApplicationErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <ErrorNotice
        error="Could not load Chyron."
        onRetry={() => location.reload()}
      />
    ) : (
      this.props.children
    );
  }
}
