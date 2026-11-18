import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { MantineProvider } from "@mantine/core";
import App from "./App.tsx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Notifications } from "@mantine/notifications";
import "./i18n";
import "./index.css";
import NetworkStatus from "./components/NetworkStatus";
import ChunkErrorBoundary from "./components/ChunkErrorBoundary";
import { registerOfflineWorker } from "./utils/registerOfflineWorker";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Tinmasdan so'rov yo'q (polling yo'q); `/me` (Header, profil, davomat, kurslar) — BITTA so'rov, `services/account.ts`.
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      retry: (failureCount: number, error: unknown) => {
        const err = error as { response?: { status?: number } };
        if (err?.response?.status === 403) return false;
        return failureCount < 2;
      },
    },
  },
});

registerOfflineWorker();

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <MantineProvider>
        <ChunkErrorBoundary>
          <App />
        </ChunkErrorBoundary>
        <NetworkStatus />
        <Notifications position="top-right" />
      </MantineProvider>
    </BrowserRouter>
  </QueryClientProvider>,
);
