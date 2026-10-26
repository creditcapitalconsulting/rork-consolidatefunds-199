import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { StoreProvider } from "@/lib/store";

import Landing from "./pages/Landing";
import Apply from "./pages/apply/Apply";
import Scenarios from "./pages/Scenarios";
import AdminLayout from "./pages/admin/AdminLayout";
import Queue from "./pages/admin/Queue";
import AppDetail from "./pages/admin/AppDetail";
import Reports from "./pages/admin/Reports";
import Settings from "./pages/admin/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <StoreProvider>
      <TooltipProvider>
        <Toaster theme="dark" position="bottom-right" />
        <ErrorBoundary>
          <BrowserRouter
            future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
          >
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/apply" element={<Apply />} />
              <Route path="/apply/:step" element={<Apply />} />
              <Route path="/scenarios" element={<Scenarios />} />
              <Route path="/underwriting" element={<AdminLayout />}>
                <Route index element={<Queue />} />
                <Route path="app/:id" element={<AppDetail />} />
                <Route path="reports" element={<Reports />} />
                <Route path="settings" element={<Settings />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </ErrorBoundary>
      </TooltipProvider>
    </StoreProvider>
  </QueryClientProvider>
);

export default App;
