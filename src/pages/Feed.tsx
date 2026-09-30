import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import PostCard from "../components/PostCard";
import StoryBar from "../components/StoryBar";
import { Link } from "react-router-dom";
import { Camera } from "lucide-react";

export default function Feed() {
  const posts = useQuery(api.posts.feed, {});

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <StoryBar />
      {!posts && (
        <div className="space-y-6">
          {[0, 1].map((i) => (
            <div key={i} className="h-96 animate-pulse rounded-2xl bg-surface-2" />
          ))}
        </div>
      )}
      {posts && posts.length === 0 && (
        <div className="rounded-2xl border border-hair bg-surface p-10 text-center">
          <Camera className="mx-auto mb-3 text-zinc-500" size={36} />
          <h2 className="font-bold">فید خالی است</h2>
          <p className="mt-1 text-sm text-zinc-400">اولین پست را منتشر کن یا افراد جدید را دنبال کن.</p>
          <Link to="/create" className="mt-4 inline-block rounded-xl bg-brand-500 px-5 py-2.5 font-bold hover:bg-brand-600">
            انتشار اولین پست
          </Link>
        </div>
      )}
      {posts?.map((post) => <PostCard key={post._id} post={post} />)}
    </div>
  );
}
