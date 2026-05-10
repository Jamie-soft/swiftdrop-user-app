import { ReactNode, useEffect } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/authStore";
import { useProfile } from "@/lib/profileStore";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/auth/login" });
      return;
    }
    if (
      !loading &&
      user &&
      !profileLoading &&
      (!profile?.full_name || !profile?.phone) &&
      pathname !== "/auth/complete-profile"
    ) {
      navigate({ to: "/auth/complete-profile" });
    }
  }, [loading, user, profileLoading, profile, pathname, navigate]);

  const profileIncomplete =
    !!user && !profileLoading && (!profile?.full_name || !profile?.phone);

  if (loading || !user || profileLoading || profileIncomplete) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  return <>{children}</>;
}
