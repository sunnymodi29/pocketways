"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { ThemeProvider } from "next-themes";
import { useState } from "react";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AccountSync } from "./account-sync";
import { AnimatedFavicon } from "./animated-favicon";
import { InstallChip } from "./install";
import { RouteProgress } from "./route-progress";
import { SignInHost } from "./sign-in";

export function Providers({ children }: { children: React.ReactNode }) {
  const [qc] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } }));
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
      {/* SessionProvider wraps everything that reads the session, including AccountSync */}
      <SessionProvider>
        <QueryClientProvider client={qc}>
          <NuqsAdapter>
            <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
          </NuqsAdapter>
        </QueryClientProvider>
        <AccountSync />
      </SessionProvider>
      <RouteProgress />
      <AnimatedFavicon />
      <InstallChip />
      <SignInHost />
      <Toaster position="bottom-center" />
    </ThemeProvider>
  );
}