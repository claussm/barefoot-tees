import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Players from "./pages/Players";
import Teams from "./pages/Teams";
import Statistics from "./pages/Statistics";
import EventDetail from "./pages/EventDetail";
import Auth from "./pages/Auth";
import ScorerDashboard from "./pages/ScorerDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<ProtectedRoute requiredRole="admin"><Index /></ProtectedRoute>} />
            <Route path="/players" element={<ProtectedRoute requiredRole="admin"><Players /></ProtectedRoute>} />
            <Route path="/teams" element={<ProtectedRoute requiredRole="admin"><Teams /></ProtectedRoute>} />
            <Route path="/statistics" element={<ProtectedRoute requiredRole="admin"><Statistics /></ProtectedRoute>} />
            <Route path="/events/:id" element={<ProtectedRoute><EventDetail /></ProtectedRoute>} />
            <Route path="/scorer" element={<ProtectedRoute requiredRole="scorer"><ScorerDashboard /></ProtectedRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
