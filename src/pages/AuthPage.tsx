import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthActions } from "@convex-dev/auth/react";
import { Loader2 } from "lucide-react";

export default function AuthPage() {
  const { signIn } = useAuthActions();
  const navigate = useNavigate();
  const location = useLocation() as any;
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const returnTo = location.state?.from ?? "/feed";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn("password", {
        flow: mode,
        email,
        password,
        ...(mode === "signUp" ? { name } : {}),
      });
      navigate(returnTo, { replace: true });
    } catch (err: any) {
      setError(err?.message ?? "خطایی رخ داد");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="brand-text-gradient text-4xl font-extrabold tracking-tight">Instagraam</div>
          <p className="mt-2 text-sm text-zinc-400">
            {mode === "signIn" ? "خوش برگشتی! وارد شو." : "حساب جدید بساز و شروع کن."}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-3 rounded-2xl border border-hair bg-surface p-6">
          {mode === "signUp" && (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="نام کامل"
              className="w-full rounded-xl border border-hair bg-surface-2 px-4 py-3 text-sm outline-none focus:border-brand-500"
            />
          )}
          <input
            type="email"
            dir="ltr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ایمیل"
            className="w-full rounded-xl border border-hair bg-surface-2 px-4 py-3 text-sm outline-none focus:border-brand-500"
          />
          <input
            type="password"
            dir="ltr"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="رمز عبور"
            className="w-full rounded-xl border border-hair bg-surface-2 px-4 py-3 text-sm outline-none focus:border-brand-500"
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="brand-gradient flex w-full items-center justify-center gap-2 rounded-xl py-3 font-bold text-white disabled:opacity-60"
          >
            {busy && <Loader2 size={18} className="animate-spin" />}
            {mode === "signIn" ? "ورود" : "ثبت‌نام"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-zinc-400">
          {mode === "signIn" ? "حساب نداری؟ " : "قبلاً ثبت‌نام کرده‌ای؟ "}
          <button
            className="font-bold text-brand-400 hover:underline"
            onClick={() => setMode(mode === "signIn" ? "signUp" : "signIn")}
          >
            {mode === "signIn" ? "ثبت‌نام" : "ورود"}
          </button>
        </p>
        <p className="mt-6 text-center text-xs text-zinc-600">
          <button onClick={() => navigate("/")} className="hover:underline">بازگشت به خانه</button>
        </p>
      </div>
    </div>
  );
}
