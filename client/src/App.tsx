import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import IndexPage from "@/pages/index";
import IssuePage from "@/pages/zine/[slug]";
import AdminLogin from "@/pages/admin/login";
import AdminDashboard from "@/pages/admin/index";
import AdminImport from "@/pages/admin/import";
import AdminContent from "@/pages/admin/content";
import AdminChat from "@/pages/admin/chat";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={IndexPage} />
      <Route path="/zine/:slug" component={IssuePage} />
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/import" component={AdminImport} />
      <Route path="/admin/content" component={AdminContent} />
      <Route path="/admin/chat" component={AdminChat} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="dark min-h-screen">
          <Toaster />
          <Router />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
