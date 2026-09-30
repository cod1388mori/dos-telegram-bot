import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { Heart, MessageCircle, Trash2, Send } from "lucide-react";
import { api } from "../convex/_generated/api";
import Avatar from "./Avatar";
import { useCurrentUser } from "../hooks/useCurrentUser";

export default function PostCard({ post }: { post: any }) {
  const me = useCurrentUser();
  const comments = useQuery(api.posts.listComments, { postId: post._id });
  const toggleLike = useMutation(api.posts.toggleLike);
  const addComment = useMutation(api.posts.addComment);
  const removePost = useMutation(api.posts.remove);
  const [showComments, setShowComments] = useState(false);
  const [text, setText] = useState("");
  const [burst, setBurst] = useState(false);

  const mine = me && post.author && me._id === post.author._id;

  return (
    <article className="overflow-hidden rounded-2xl border border-hair bg-surface">
      <header className="flex items-center gap-3 px-4 py-3">
        <Avatar src={post.author?.image} name={post.author?.username ?? post.author?.name} size={38} ring />
        <div className="flex flex-1 flex-col leading-tight">
          <Link to={`/u/${post.author?.username}`} className="text-sm font-bold hover:underline">
            {post.author?.username ?? post.author?.name ?? "کاربر"}
          </Link>
          <span className="text-xs text-zinc-500">
            {new Date(post._creationTime).toLocaleDateString("fa-IR")}
          </span>
        </div>
        {mine && (
          <button
            className="rounded-lg p-2 text-zinc-500 hover:bg-surface-2 hover:text-red-400"
            title="حذف پست"
            onClick={() => void removePost({ postId: post._id })}
          >
            <Trash2 size={18} />
          </button>
        )}
      </header>

      <div className="bg-black">
        <img src={post.url} alt="" className="max-h-[640px] w-full object-cover" loading="lazy" />
      </div>

      <div className="space-y-2 px-4 py-3">
        {post.caption && <p className="text-sm leading-6 text-zinc-200 whitespace-pre-wrap">{post.caption}</p>}
        <div className="flex items-center gap-4">
          <button
            className="group flex items-center gap-1.5"
            onClick={async () => {
              setBurst(true);
              setTimeout(() => setBurst(false), 400);
              await toggleLike({ postId: post._id });
            }}
          >
            <Heart
              size={24}
              className={`transition-all ${post.liked ? "fill-brand-500 text-brand-500 scale-110" : "text-zinc-300 group-hover:text-brand-400"} ${burst ? "scale-125" : ""}`}
            />
            <span className="text-sm text-zinc-300">{post.likes}</span>
          </button>
          <button className="flex items-center gap-1.5" onClick={() => setShowComments((v) => !v)}>
            <MessageCircle size={24} className="text-zinc-300" />
            <span className="text-sm text-zinc-300">{post.comments}</span>
          </button>
        </div>

        {showComments && (
          <div className="space-y-3 border-t border-hair pt-3">
            {(comments ?? []).map((c) => (
              <div key={c._id} className="flex items-start gap-2">
                <Avatar src={c.author?.image} name={c.author?.username} size={28} />
                <div className="text-sm">
                  <span className="font-bold">{c.author?.username ?? c.author?.name}</span>{" "}
                  <span className="text-zinc-300">{c.body}</span>
                </div>
              </div>
            ))}
            <form
              className="flex items-center gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!text.trim()) return;
                await addComment({ postId: post._id, body: text });
                setText("");
              }}
            >
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="کامنت بنویس…"
                className="flex-1 rounded-xl border border-hair bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
              <button type="submit" className="rounded-xl bg-brand-500 px-3 py-2 text-sm font-bold text-white hover:bg-brand-600">
                <Send size={16} />
              </button>
            </form>
          </div>
        )}
      </div>
    </article>
  );
}
