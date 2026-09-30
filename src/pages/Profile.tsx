import { useParams } from "react-router-dom";
import { useQuery, useMutation, useConvex } from "convex/react";
import { Loader2, Settings } from "lucide-react";
import { api } from "../convex/_generated/api";
import Avatar from "../components/Avatar";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { useState } from "react";

const anyApi = api as any;

export default function Profile() {
  const { username = "" } = useParams();
  const convex = useConvex();
  const me = useCurrentUser();
  const profile = useQuery(api.users.listByUsername, { username });
  const isMe = me && profile && me._id === profile._id;
  const posts = useQuery(api.posts.byUser, profile ? { userId: profile._id } : "skip");
  const counts = useQuery(api.follows.counts, profile ? { userId: profile._id } : "skip");
  const isFollowing = useQuery(api.follows.isFollowing, profile && !isMe ? { targetId: profile._id } : "skip");
  const toggleFollow = useMutation(api.follows.toggle);
  const setImage = useMutation(api.users.setImage);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const updateProfile = useMutation(api.users.updateProfile);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({ username: "", fullname: "", bio: "" });
  const [busy, setBusy] = useState(false);

  if (!profile) {
    return <p className="py-24 text-center text-zinc-500">پروفایل پیدا نشد.</p>;
  }

  async function pickAvatar(file: File) {
    setBusy(true);
    try {
      const uploadUrl = await generateUploadUrl({});
      const res = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": file.type }, body: file });
      const { storageId } = await res.json();
      const url = await convex.query(anyApi.files.getUrl, { storageId });
      if (url) await setImage({ image: url });
    } finally {
      setBusy(false);
    }
  }

  async function saveProfile() {
    setBusy(true);
    try {
      await updateProfile(form);
      setEditOpen(false);
    } finally {
      setBusy(false);
    }
  }

  const uname = profile.username ?? profile.name;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="flex items-start gap-6 rounded-2xl border border-hair bg-surface p-6">
        <label className="cursor-pointer">
          <Avatar src={profile.image ?? undefined} name={uname} size={84} ring />
          {isMe && (
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void pickAvatar(f);
              }}
            />
          )}
        </label>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-extrabold">{uname}</h1>
            {isMe ? (
              <>
                <button
                  onClick={() => {
                    setForm({ username: profile.username ?? "", fullname: profile.fullname ?? "", bio: profile.bio ?? "" });
                    setEditOpen(true);
                  }}
                  className="rounded-xl border border-hair px-4 py-1.5 text-sm font-bold hover:bg-surface-2"
                >
                  ویرایش پروفایل
                </button>
                <Settings size={18} className="text-zinc-500" />
              </>
            ) : (
              <button
                onClick={() => void toggleFollow({ targetId: profile._id })}
                className={`rounded-xl px-5 py-1.5 text-sm font-bold ${
                  isFollowing ? "border border-hair hover:bg-surface-2" : "bg-brand-500 hover:bg-brand-600"
                }`}
              >
                {isFollowing ? "دنبال‌شده" : "دنبال کردن"}
              </button>
            )}
          </div>
          {profile.fullname && <p className="mt-1 text-sm text-zinc-300">{profile.fullname}</p>}
          {profile.bio && <p className="mt-2 text-sm leading-6 text-zinc-400 whitespace-pre-wrap">{profile.bio}</p>}
          <div className="mt-3 flex gap-6 text-sm">
            <span><b>{posts?.length ?? 0}</b> پست</span>
            <span><b>{counts?.followers ?? 0}</b> دنبال‌کننده</span>
            <span><b>{counts?.following ?? 0}</b> دنبال‌شده</span>
          </div>
        </div>
      </header>

      {posts?.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-hair py-16 text-center text-zinc-500">
          هنوز پستی منتشر نشده.
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1 md:gap-2">
          {posts?.map((p) => (
            <div key={p._id} className="aspect-square overflow-hidden rounded-lg bg-surface-2">
              <img src={p.url ?? undefined} alt="" className="h-full w-full object-cover" loading="lazy" />
            </div>
          ))}
        </div>
      )}

      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setEditOpen(false)}>
          <div className="w-full max-w-sm space-y-3 rounded-2xl border border-hair bg-surface p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-extrabold">ویرایش پروفایل</h2>
            <input
              dir="ltr"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="username"
              className="w-full rounded-xl border border-hair bg-surface-2 px-4 py-2.5 text-sm outline-none focus:border-brand-500"
            />
            <input
              value={form.fullname}
              onChange={(e) => setForm({ ...form, fullname: e.target.value })}
              placeholder="نام کامل"
              className="w-full rounded-xl border border-hair bg-surface-2 px-4 py-2.5 text-sm outline-none focus:border-brand-500"
            />
            <textarea
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              placeholder="بیو"
              rows={3}
              className="w-full resize-none rounded-xl border border-hair bg-surface-2 px-4 py-2.5 text-sm outline-none focus:border-brand-500"
            />
            <button
              onClick={saveProfile}
              disabled={busy}
              className="brand-gradient w-full rounded-xl py-2.5 font-bold text-white disabled:opacity-60"
            >
              {busy && <Loader2 className="mr-1 inline" size={16} />} ذخیره
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
