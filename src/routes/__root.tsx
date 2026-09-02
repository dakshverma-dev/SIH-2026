import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportAppError } from "../lib/error-reporting";
import { AuthProvider } from "../lib/auth";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="eyebrow mb-3">Error 404</p>
        <h1 className="font-serif text-4xl text-foreground">This page does not exist</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          The address you followed is not part of Plan2Reality. Nothing was lost.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
          >
            Return to the start
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportAppError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="panel max-w-md p-8 text-center">
        <p className="eyebrow mb-3">Render failure</p>
        <h1 className="font-serif text-2xl text-foreground">This page failed to render</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          The underlying data was not lost. You can retry, or return to the command center.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-border-strong bg-panel px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-panel-2"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Plan2Reality" },
      { name: "description", content: "Turn field reality into schedule truth." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "alternate icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const purgeBadges = () => {
      // 1. Selector-based removal
      const selectors = [
        "#lovable-badge",
        "#lovable-tag",
        ".lovable-badge",
        "[class*='lovable']",
        "[id*='lovable']",
        "a[href*='lovable.dev']",
        "button[aria-label*='lovable' i]",
      ];
      selectors.forEach((sel) => {
        try {
          document.querySelectorAll(sel).forEach((el) => el.remove());
        } catch {}
      });

      // 2. Direct body inspection for injected fixed widgets
      document.querySelectorAll("body > div, body > aside, body > iframe, body > button").forEach((el) => {
        try {
          const html = el.outerHTML?.toLowerCase() || "";
          if (
            html.includes("lovable") ||
            html.includes("gpteng") ||
            html.includes("edit with") ||
            html.includes("remix")
          ) {
            el.remove();
          }
        } catch {}
      });
    };

    purgeBadges();
    const interval = setInterval(purgeBadges, 250);
    const observer = new MutationObserver(purgeBadges);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      clearInterval(interval);
      observer.disconnect();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <Outlet />
      </AuthProvider>
    </QueryClientProvider>
  );
}

