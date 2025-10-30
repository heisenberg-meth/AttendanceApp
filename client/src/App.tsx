import { useState, useEffect } from "react";
import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/authContext";
import SplashScreen from "@/pages/splash";
import LoginPage from "@/pages/login";
import SignupPage from "@/pages/signup";
import OnboardingPage from "@/pages/onboarding";
import AttendancePage from "@/pages/attendance";
import LeavesPage from "@/pages/leaves";
import ChatPage from "@/pages/chat";
import ProfilePage from "@/pages/profile";
import SuperadminDashboard from "@/pages/superadmin-dashboard";
import { PageLoader } from "@/components/loader";
import NotFound from "@/pages/not-found";

function ProtectedRoute({ component: Component }: { component: () => JSX.Element }) {
  const { firebaseUser, employee, loading } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  if (!firebaseUser) {
    return <Redirect to="/login" />;
  }

  if (!employee) {
    return <Redirect to="/onboarding" />;
  }

  return <Component />;
}

function SuperadminRoute({ component: Component }: { component: () => JSX.Element }) {
  const { firebaseUser, employee, loading } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  if (!firebaseUser || !employee) {
    return <Redirect to="/login" />;
  }

  if (employee.role !== "superadmin") {
    return <Redirect to="/" />;
  }

  return <Component />;
}

function AuthRoute({ component: Component }: { component: (props: any) => JSX.Element; props?: any }) {
  const { firebaseUser, employee, loading } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  if (firebaseUser && employee) {
    if (employee.role === "superadmin") {
      return <Redirect to="/superadmin" />;
    }
    return <Redirect to="/" />;
  }

  return <Component onLoginSuccess={() => {}} />;
}

function Router() {
  return (
    <Switch>
      {/* Auth Routes */}
      <Route path="/login">
        {() => <AuthRoute component={LoginPage} />}
      </Route>
      <Route path="/signup">
        {() => <AuthRoute component={SignupPage} />}
      </Route>
      <Route path="/onboarding" component={OnboardingPage} />

      {/* Employee Routes */}
      <Route path="/">
        {() => <ProtectedRoute component={AttendancePage} />}
      </Route>
      <Route path="/leaves">
        {() => <ProtectedRoute component={LeavesPage} />}
      </Route>
      <Route path="/chat">
        {() => <ProtectedRoute component={ChatPage} />}
      </Route>
      <Route path="/profile">
        {() => <ProtectedRoute component={ProfilePage} />}
      </Route>

      {/* Superadmin Route */}
      <Route path="/superadmin">
        {() => <SuperadminRoute component={SuperadminDashboard} />}
      </Route>

      {/* 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          {showSplash ? (
            <SplashScreen onComplete={() => setShowSplash(false)} />
          ) : (
            <Router />
          )}
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
