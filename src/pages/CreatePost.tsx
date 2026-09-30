import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "convex/react";
import { ImagePlus, Loader2 } from "lucide-react";
import { api } from "../convex/_generated/api";

export default function CreatePost() {
  const navigate = useNavigate();
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const createPost = useMutation(api.posts.create);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const uploadUrl = await generateUploadUrl({});
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await res.json();
      await createPost({ storageId, caption: caption.trim() || undefined });
      navigate("/feed");
    } catch (err: any) {
      setError(err?.message ?? "آپلود ناموفق بود");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-2xl font-extrabold">پست جدید</h1>

      <label className="flex aspect-video cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-hair bg-surface transition hover:border-brand-500/50">
        {preview ? (
          <img src={preview} alt="" className="h-full w-full rounded-2xl object-cover" />
        ) : (
          <div className="text-center text-zinc-500">
            <ImagePlus className="mx-auto mb-2" size={36} />
            <p className="text-sm font-medium">عکس را انتخاب کن</p>
          </div>
        )}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) {
              setFile(f);
              setPreview(URL.createObjectURL(f));
            }
          }}
        />
      </label>

      <textarea
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="کپشن بنویس…"
        rows={3}
        className="w-full resize-none rounded-2xl border border-hair bg-surface-2 px-4 py-3 text-sm outline-none focus:border-brand-500"
      />

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        onClick={submit}
        disabled={!file || busy}
        className="brand-gradient flex w-full items-center justify-center gap-2 rounded-2xl py-3 font-bold text-white disabled:opacity-50"
      >
        {busy && <Loader2 size={18} className="animate-spin" />}
        انتشار پست
      </button>
    </div>
  );
}
