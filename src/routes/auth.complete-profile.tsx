import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, UserCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/authStore";
import { upsertProfile, useProfile } from "@/lib/profileStore";

export const Route = createFileRoute("/auth/complete-profile")({
  head: () => ({
    meta: [
      { title: "Complete Your Profile — SwiftDrop" },
      { name: "description", content: "Add your name and phone to finish signing up." },
    ],
  }),
  component: CompleteProfilePage,
});

function CompleteProfilePage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading, refresh } = useProfile();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth/login" });
  }, [authLoading, user, navigate]);

  // If already complete, skip
  useEffect(() => {
    if (!profileLoading && profile?.full_name && profile?.phone) {
      navigate({ to: "/home" });
    }
  }, [profileLoading, profile, navigate]);

  const disabled =
    !fullName.trim() || phone.replace(/\D/g, "").length < 10 || submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled) return;
    setSubmitting(true);
    try {
      await upsertProfile(fullName, phone);
      await refresh();
      toast.success("Profile saved");
      navigate({ to: "/home" });
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to save profile");
      setSubmitting(false);
    }
  };

  if (authLoading || profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
            <UserCircle className="h-6 w-6 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <h1 className="mt-4 text-2xl font-bold">Complete your profile</h1>
          <p className="mt-1 text-center text-sm text-muted-foreground">
            We&apos;ll use this to coordinate your deliveries and rides.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Full Name
            </label>
            <input
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-primary"
              placeholder="John Doe"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Phone
            </label>
            <input
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-primary"
              placeholder="+234 801 234 5678"
              required
            />
          </div>

          <button
            type="submit"
            disabled={disabled}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-glow transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
