
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { VoiceCallProvider } from "./contexts/VoiceCallContext";

// Pages
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import ChatRoom from "./pages/ChatRoom";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import ExploreGroups from "./pages/ExploreGroups";
import NotFound from "./pages/NotFound";
import Admin from "./pages/Admin";
import GroupVoiceCall from "./pages/GroupVoiceCall";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <ThemeProvider defaultTheme="light" storageKey="connectiverse-theme">
        <AuthProvider>
          <VoiceCallProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/chat/:groupId" element={<ChatRoom />} />
                <Route path="/voice-call/:groupId" element={<GroupVoiceCall />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/explore" element={<ExploreGroups />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </TooltipProvider>
          </VoiceCallProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
