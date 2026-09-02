type AppErrorOptions = {
  mechanism?: "manual" | "onerror" | "unhandledrejection" | "react_error_boundary";
  handled?: boolean;
  severity?: "error" | "warning" | "info";
};

export function reportAppError(error: unknown, context: Record<string, unknown> = {}, options?: AppErrorOptions) {
  if (typeof window === "undefined") return;
  console.error("[App Error]", error, context, options);
}
