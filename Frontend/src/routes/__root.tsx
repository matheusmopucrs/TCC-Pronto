import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { SiteSidebar } from "@/components/SiteSidebar";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="max-w-md text-center">
        <div className="font-mono text-xs uppercase tracking-widest text-ink-muted">
          Error 404
        </div>
        <h1 className="font-serif text-5xl mt-4 text-ink tracking-tight">Page not found</h1>
        <p className="mt-4 text-sm text-ink-muted">
          This briefing section does not exist or was moved.
        </p>
        <div className="mt-8">
          <Link
            to="/"
            className="inline-flex items-center justify-center bg-ink px-6 py-3 text-sm font-medium text-paper transition-colors hover:bg-ink-muted"
          >
            Return to summary
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Ockham Intelligence — Quant Forecast Briefing" },
      {
        name: "description",
        content:
          "AI-driven price forecasting briefing for equities and crypto using LSTM and XGBoost models.",
      },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
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
  return (
    <div className="min-h-dvh bg-paper text-ink flex">
      <SiteSidebar />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
