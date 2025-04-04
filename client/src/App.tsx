import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import ProgressPage from "@/pages/progress-page";
import StudyListPage from "@/pages/study-list-page";
import DomainPage from "@/pages/domain-page";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";

function Router() {
  return (
    <Switch>
      {/* Add protected routes */}
      <ProtectedRoute path="/" component={HomePage} />
      <ProtectedRoute path="/progress" component={ProgressPage} />
      <ProtectedRoute path="/study-list" component={StudyListPage} />
      <ProtectedRoute path="/domain/:domain" component={DomainPage} />
      
      {/* Public routes */}
      <Route path="/auth" component={AuthPage} />
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
