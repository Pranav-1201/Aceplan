import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type SessionState = "checking" | "signedIn" | "signedOut";

// Wraps the routes that need a signed-in user (see src/App.tsx). While the session is being
// looked up it shows a short loading message, then it either renders the page or sends the
// visitor to /auth. It also reacts to later changes, so signing out anywhere returns to /auth.
// Row level security still protects the data itself; this only stops signed-out visitors from
// seeing empty pages.
const ProtectedRoute = () => {
  const [state, setState] = useState<SessionState>("checking");

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setState(session ? "signedIn" : "signedOut");
    });

    supabase.auth.getSession().then(({ data }) => {
      setState(data.session ? "signedIn" : "signedOut");
    });

    return () => subscription.unsubscribe();
  }, []);

  if (state === "checking") {
    return (
      <div role="status" className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (state === "signedOut") {
    return <Navigate to="/auth" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
