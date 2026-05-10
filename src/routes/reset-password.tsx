import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({ component: ResetPasswordPage });

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const isRecoveryMode = useMemo(() => {
    if (typeof window === "undefined") return false;
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    return hash.get("type") === "recovery";
  }, []);

  useEffect(() => {
    if (!isRecoveryMode) {
      toast.error("Invalid or expired reset link.");
      navigate({ to: "/auth" });
    }
  }, [isRecoveryMode, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password kam se kam 8 characters ka hona chahiye.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords match nahi kar rahe.");
      return;
    }

    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Password updated. Ab sign in kariye.");
    navigate({ to: "/auth" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md glass rounded-2xl p-8 shadow-elegant">
        <div className="text-center mb-6">
          <div className="display text-2xl font-bold tracking-widest gradient-gold-text">DEVLYNIX</div>
          <div className="text-xs text-muted-foreground tracking-[0.25em] mt-1">RESET PASSWORD</div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label>New password</Label>
            <Input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div>
            <Label>Confirm password</Label>
            <Input type="password" required minLength={8} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </div>
          <Button disabled={busy} className="w-full bg-gold text-primary-foreground hover:bg-gold/90">
            {busy ? "Updating…" : "Update password"}
          </Button>
        </form>
      </div>
    </div>
  );
}