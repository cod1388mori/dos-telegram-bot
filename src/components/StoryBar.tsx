import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { X, Plus } from "lucide-react";
import { api } from "../convex/_generated/api";
import Avatar from "./Avatar";
import { useCurrentUser } from "../hooks/useCurrentUser";

export default function StoryBar() {
  const me = useCurrentUser();
  const groups = useQuery(api.stories.active, {}) ?? [];
  const createStory = useMutation(api.stories.create);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const [viewerIdx, setViewerIdx] = useState<number | null>(null);
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    if (viewerIdx === null) return;
    const group = groups[viewerIdx];
    if (!group) return setViewerIdx(null);
    const t = setTimeout(() => {
      if (slide + 1 < group.items.length) setSlide(slide + 1);
      else if (viewerIdx + 1 < groups.length) {
        setViewerIdx(viewerIdx + 1);
        setSlide(0);
      } else setViewerIdx(null);
    }, 4000);
    return () => clearTimeout(t);
  }, [viewerIdx, slide, groups]);

  async function uploadStory(file: File) {
    const url = await generateUploadUrl({});
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": file.type }, body: file });
    const { storageId } = await res.json();
    await createStory({ storageId });
  }

  return (
    <div className="mb-6 flex gap-4 overflow-x-auto pb-2">
      {me && (
        <label className="flex w-16 flex-col items-center gap-1">
          <div className="relative">
            <Avatar src={me.image} name={me.username ?? me.name} size={56} ring />
            <span className="absolute -bottom-0.5 -left-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-white">
              <Plus size={14} />
            </span>
          </div>
          <span className="truncate text-[11px] text-zinc-400">استوری تو</span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void uploadStory(f);
              e.target.value = "";
            }}
          />
        </label>
      )}
      {groups.map((g: any, i: number) => (
        <button key={g.userId} className="flex w-16 flex-col items-center gap-1" onClick={() => { setViewerIdx(i); setSlide(0); }}>
          <Avatar src={g.user?.image} name={g.user?.username ?? g.user?.name} size={56} ring />
          <span className="w-16 truncate text-[11px] text-zinc-400">{g.user?.username ?? g.user?.name}</span>
        </button>
      ))}

      {viewerIdx !== null && groups[viewerIdx] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={() => setViewerIdx(null)}>
          <button className="absolute right-4 top-4 text-white" onClick={() => setViewerIdx(null)}>
            <X size={28} />
          </button>
          <img
            src={(groups[viewerIdx].items[slide] as any).url}
            className="max-h-[85vh] max-w-[92vw] rounded-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
            alt="story"
          />
        </div>
      )}
      {groups.length === 0 && !me && null}
    </div>
  );
}
