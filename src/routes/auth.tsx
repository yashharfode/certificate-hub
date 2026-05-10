import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export const Route = createFileRoute("/auth")({ component: AuthPage });

function AuthPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && session) navigate({ to: "/dashboard" }); }, [loading, session, navigate]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetBusy, setResetBusy] = useState(false);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error(error.message); else toast.success("Welcome back");
  };

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: `${window.location.origin}/dashboard`, data: { full_name: name } },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }

    if (!data.session) {
      toast.success("Account created. Email verify karke phir sign in kariye.");
      return;
    }

    toast.success("Account created — you're signed in.");
  };

  const sendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setResetBusy(false);
    if (error) toast.error(error.message); else toast.success("Password reset email sent.");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md glass rounded-2xl p-8 shadow-elegant">
        <div className="text-center mb-6">
          <div className="display text-2xl font-bold tracking-widest gradient-gold-text">DEVLYNIX</div>
          <div className="text-xs text-muted-foreground tracking-[0.25em] mt-1">CERTIFICATE STUDIO</div>
        </div>
        <Tabs defaultValue="signin">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Create Account</TabsTrigger>
          </TabsList>
          <TabsContent value="signin">
            <form onSubmit={signIn} className="space-y-4 mt-4">
              <div><Label>Email</Label><Input type="email" required value={email} onChange={(e)=>setEmail(e.target.value)} /></div>
              <div><Label>Password</Label><Input type="password" required value={password} onChange={(e)=>setPassword(e.target.value)} /></div>
              <Button disabled={busy} className="w-full bg-gold text-primary-foreground hover:bg-gold/90">{busy ? "Signing in…" : "Sign In"}</Button>
              <div className="text-center">
                <Dialog>
                  <DialogTrigger asChild>
                    <button type="button" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Forgot password?</button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Reset password</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={sendReset} className="space-y-4">
                      <div>
                        <Label>Email</Label>
                        <Input type="email" required value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} />
                      </div>
                      <Button disabled={resetBusy} className="w-full bg-gold text-primary-foreground hover:bg-gold/90">
                        {resetBusy ? "Sending…" : "Send reset link"}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </form>
          </TabsContent>
          <TabsContent value="signup">
            <form onSubmit={signUp} className="space-y-4 mt-4">
              <div><Label>Full name</Label><Input required value={name} onChange={(e)=>setName(e.target.value)} /></div>
              <div><Label>Email</Label><Input type="email" required value={email} onChange={(e)=>setEmail(e.target.value)} /></div>
              <div><Label>Password</Label><Input type="password" required minLength={8} value={password} onChange={(e)=>setPassword(e.target.value)} /></div>
              <Button disabled={busy} className="w-full bg-gold text-primary-foreground hover:bg-gold/90">{busy ? "Creating…" : "Create Account"}</Button>
              <p className="text-xs text-muted-foreground text-center">First account becomes the Owner. Subsequent accounts need manager access from the Owner.</p>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}