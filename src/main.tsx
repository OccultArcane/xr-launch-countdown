import { Toaster } from "@/components/ui/sonner";
import { RequireAuth } from "@/components/RequireAuth";
import { VlyToolbar } from "../vly-toolbar-readonly.tsx";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { convexUrl, hasConvex } from "@/lib/convex";
import React, { StrictMode, useEffect, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Link,
  Route,
  Routes,
  useLocation,
} from "react-router";
import "./index.css";

// Lazy load route components for better code splitting
const Landing = lazy(() => import("./pages/Landing.tsx"));
const ProductDetail = lazy(() => import("./pages/ProductDetail.tsx"));
const AuthPage = lazy(() => import("./pages/Auth.tsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

// Simple loading fallback for route transitions
function RouteLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
    </div>
  );
}

/** Silent error boundary — if VlyToolbar crashes it renders nothing instead of
 *  crashing the whole app (e.g. hook errors in the browser runtime). */
class ToolbarErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err: Error) {
    console.warn("[VlyToolbar] Caught error, toolbar disabled:", err.message);
  }
  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

/** Hard guard so runtime errors never leave the preview as a blank page. */
class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string; stack: string }
> {
  state = { hasError: false, message: "", stack: "" };
  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
      message: error.message || "Unknown runtime error",
      stack: error.stack || "",
    };
  }
  componentDidCatch(err: Error) {
    console.error("[Preview] Root crash:", err);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
          <div className="max-w-lg text-center">
            <p className="text-sm font-semibold">Preview runtime error</p>
            <p className="mt-2 text-xs text-muted-foreground break-words">
              {this.state.message}
            </p>
            {this.state.stack && (
              <pre className="mt-3 text-left text-[10px] leading-4 text-muted-foreground/80 max-h-40 overflow-auto rounded border border-border/60 p-2">
                {this.state.stack}
              </pre>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * The client is only built when the deployment URL is present — Convex
 * throws on an empty address at import time, which would blank the whole
 * page instead of rendering the storefront.
 */
const convex = hasConvex ? new ConvexReactClient(convexUrl) : null;

/**
 * Vite's base without its trailing slash, so the router matches routes under
 * whatever sub-path the build is hosted at ("" at a domain root, "/<repo>"
 * on GitHub Pages).
 */
const basename = import.meta.env.BASE_URL.replace(/\/$/, "");

/**
 * Sign-in and the dashboard are the only screens that need the backend.
 * With no deployment configured there is nothing to sign in to, so they
 * say so rather than crashing inside an auth hook.
 */
function BackendNotice() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0a0a0a] p-6 font-mono text-neutral-300">
      <div className="max-w-sm border border-white/10 px-6 py-8 text-center">
        <p className="text-[10px] uppercase tracking-[0.35em] text-xr-red">
          backend offline
        </p>
        <p className="mt-5 text-[13px] leading-relaxed text-neutral-400">
          Accounts need a Convex deployment. Set <code>VITE_CONVEX_URL</code>{" "}
          (run <code>npx convex dev</code>) and this screen becomes the sign-in
          flow.
        </p>
        <Link
          to="/"
          className="mt-8 inline-block border border-white/20 px-5 py-3 text-[11px] uppercase tracking-[0.3em] text-neutral-100 transition-colors hover:border-white hover:bg-white hover:text-[#0a0a0a]"
        >
          ← back to the store
        </Link>
      </div>
    </main>
  );
}

/** Renders the screen only when there is a deployment behind it. */
const withBackend = (screen: React.ReactNode) =>
  hasConvex ? screen : <BackendNotice />;

function RouteSyncer() {
  const location = useLocation();
  useEffect(() => {
    window.parent.postMessage(
      { type: "iframe-route-change", path: location.pathname },
      "*",
    );
  }, [location.pathname]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "navigate") {
        if (event.data.direction === "back") window.history.back();
        if (event.data.direction === "forward") window.history.forward();
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return null;
}

const app = (
  <>
    <BrowserRouter basename={basename || undefined}>
      <RouteSyncer />
      <Suspense fallback={<RouteLoading />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/products/:id" element={<ProductDetail />} />
          <Route
            path="/auth"
            element={withBackend(<AuthPage redirectAfterAuth="/dashboard" />)}
          />
          <Route
            path="/dashboard"
            element={withBackend(
              <RequireAuth>
                <Dashboard />
              </RequireAuth>,
            )}
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
    <Toaster />
  </>
);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RootErrorBoundary>
      <ToolbarErrorBoundary>
        <VlyToolbar />
      </ToolbarErrorBoundary>
      {convex ? (
        <ConvexAuthProvider client={convex}>{app}</ConvexAuthProvider>
      ) : (
        app
      )}
    </RootErrorBoundary>
  </StrictMode>,
);
