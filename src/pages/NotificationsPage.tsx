import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { Heart, MessageCircle, UserPlus } from "lucide-react";
import { api } from "../convex/_generated/api";
import Avatar from "../components/Avatar";

export default function NotificationsPage() {
  const notifications = useQuery(api.notifications.list, {}) ?? [];

  return (
    <div className="mx-auto max-w-xl space-y-2">
      <h1 className="mb-4 text-2xl font-extrabold">اعلان‌ها</h1>
      {notifications.length === 0 && (
        <p className="py-16 text-center text-zinc-500">فعلاً اعلانی نداری.</p>
      )}
      {notifications.map((n: any) => (
        <div key={n._id} className={`flex items-center gap-3 rounded-2xl border p-3 ${n.read ? "border-hair bg-surface" : "border-brand-500/30 bg-brand-500/5"}`}>
          <Avatar src={n.sender?.image} name={n.sender?.username ?? n.sender?.name} size={40} />
          <div className="flex-1 text-sm leading-6">
            <span className="font-bold">{n.sender?.username ?? n.sender?.name}</span>{" "}
            {n.kind === "like" && <>پستت را لایک کرد.</>}
            {n.kind === "comment" && <>روی پستت کامنت گذاشت.</>}
            {n.kind === "follow" && <>تو را دنبال کرد.</>}
          </div>
          {n.kind === "like" && <Heart size={18} className="text-brand-400" fill="currentColor" />}
          {n.kind === "comment" && <MessageCircle size={18} className="text-sky-400" />}
          {n.kind === "follow" && <UserPlus size={18} className="text-emerald-400" />}
          {n.postId && (
            <Link to="/feed" className="text-xs text-zinc-500 hover:underline">مشاهده</Link>
          )}
        </div>
      ))}
    </div>
  );
}
