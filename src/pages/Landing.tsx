import { Link } from "react-router-dom";
import { Camera, Heart, MessageCircle, Users, Zap, Shield } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-ink text-zinc-100">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <span className="brand-text-gradient text-2xl font-extrabold">Instagraam</span>
        <Link to="/auth" className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-bold hover:bg-brand-600">
          ورود
        </Link>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-16 text-center">
        <p className="mb-3 text-sm font-bold tracking-widest text-brand-400">شبکه اجتماعی تصویری</p>
        <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-tight sm:text-6xl">
          لحظه‌هایت را <span className="brand-text-gradient">به اشتراک بگذار</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-zinc-400">
          عکس‌ها و استوری‌هایت را منتشر کن، دوستانت را دنبال کن و فیدی زنده از دنیای اطرافت بساز — سریع، زیبا و امن.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link to="/auth" className="brand-gradient rounded-2xl px-6 py-3 font-bold shadow-lg shadow-brand-500/20 transition hover:opacity-90">
            شروع رایگان
          </Link>
          <Link to="/auth" className="rounded-2xl border border-hair px-6 py-3 font-bold text-zinc-200 hover:bg-surface-2">
            ورود به حساب
          </Link>
        </div>

        <div className="mt-14 flex items-center justify-center gap-2 text-sm text-zinc-500">
          <Zap size={16} className="text-brand-400" /> فید Real-time با Convex
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-6 pb-20 sm:grid-cols-3">
        {[
          { icon: Camera, t: "انتشار آسان", d: "عکست را انتخاب کن، کپشن بنویس و منتشر کن — در چند ثانیه." },
          { icon: Heart, t: "لایک و کامنت", d: "تعامل زنده با پست‌ها؛ لایک‌ها فوراً برای همه به‌روز می‌شود." },
          { icon: MessageCircle, t: "استوری ۲۴ ساعته", d: "لحظه‌های کوتاه که بعد از یک روز محو می‌شوند." },
          { icon: Users, t: "دنبال‌کردن", d: "دنیای خودت را بساز؛ فیدتان پر از آدم‌های جذاب شود." },
          { icon: Shield, t: "حساب امن", d: "احراز هویت با رمز عبور یا GitHub — داده‌هایت مال خودت است." },
          { icon: Zap, t: "سرعت Real-time", d: "بدون رفرش؛ همه‌چیز همان لحظه به‌روز می‌شود." },
        ].map((f) => (
          <div key={f.t} className="rounded-2xl border border-hair bg-surface p-6 transition hover:border-brand-500/40">
            <f.icon className="mb-3 text-brand-400" size={26} />
            <h3 className="mb-1 font-bold">{f.t}</h3>
            <p className="text-sm leading-6 text-zinc-400">{f.d}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-hair py-8 text-center text-sm text-zinc-500">
        ساخته‌شده با Convex · Instagraam © ۲۰۲۶
      </footer>
    </div>
  );
}
