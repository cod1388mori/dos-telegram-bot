import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { SearchIcon } from "lucide-react";
import { api } from "../convex/_generated/api";
import Avatar from "../components/Avatar";

export default function Search() {
  const [q, setQ] = useState("");
  const results = useQuery(api.users.search, { q });

  return (
    <div className="mx-auto max-w-xl">
      <div className="relative">
        <SearchIcon className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="جستجوی کاربران…"
          autoFocus
          className="w-full rounded-2xl border border-hair bg-surface-2 py-3 pl-4 pr-11 text-sm outline-none focus:border-brand-500"
        />
      </div>
      <div className="mt-4 space-y-2">
        {q.trim() !== "" && results?.length === 0 && (
          <p className="py-8 text-center text-sm text-zinc-500">نتیجه‌ای پیدا نشد.</p>
        )}
        {results?.map((u) => (
          <Link
            key={u._id}
            to={`/u/${u.username}`}
            className="flex items-center gap-3 rounded-2xl border border-hair bg-surface p-3 transition hover:border-brand-500/40"
          >
            <Avatar src={u.image} name={u.username ?? u.name} size={44} />
            <div className="leading-tight">
              <p className="font-bold">{u.username ?? u.name}</p>
              <p className="text-xs text-zinc-500">{u.fullname ?? u.name}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
