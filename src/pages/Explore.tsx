import { useQuery } from "convex/react";
import { Heart, MessageCircle } from "lucide-react";
import { api } from "../convex/_generated/api";

export default function Explore() {
  const posts = useQuery(api.posts.feed, {}) ?? [];

  return (
    <div className="grid grid-cols-3 gap-1 md:gap-2">
      {posts.map((post) => (
        <div key={post._id} className="group relative aspect-square overflow-hidden rounded-lg bg-surface-2">
          <img src={post.url ?? undefined} alt="" className="h-full w-full object-cover transition group-hover:scale-105" loading="lazy" />
          <div className="absolute inset-0 hidden items-center justify-center gap-6 bg-black/50 text-white group-hover:flex">
            <span className="flex items-center gap-1 font-bold"><Heart size={18} fill="white" /> {post.likes}</span>
            <span className="flex items-center gap-1 font-bold"><MessageCircle size={18} fill="white" /> {post.comments}</span>
          </div>
        </div>
      ))}
      {posts.length === 0 && (
        <p className="col-span-3 py-16 text-center text-zinc-500">هنوز پستی برای کاوش نیست.</p>
      )}
    </div>
  );
}
