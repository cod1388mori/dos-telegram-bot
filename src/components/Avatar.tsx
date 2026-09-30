export default function Avatar({
  src,
  name,
  size = 40,
  ring = false,
}: {
  src?: string | null;
  name?: string | null;
  size?: number;
  ring?: boolean;
}) {
  const inner = (
    <div
      className="flex items-center justify-center overflow-hidden rounded-full bg-surface-2 text-zinc-300"
      style={{ width: size, height: size }}
    >
      {src ? (
        <img src={src} alt={name ?? "avatar"} className="h-full w-full object-cover" />
      ) : (
        <span style={{ fontSize: size * 0.4 }} className="font-bold">
          {(name ?? "؟").trim().charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );

  if (!ring) return inner;
  return (
    <div className="story-ring rounded-full p-[2px]">
      <div className="rounded-full bg-ink p-[2px]">{inner}</div>
    </div>
  );
}
