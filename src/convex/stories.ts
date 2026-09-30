import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const active = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const stories = await ctx.db.query("stories").order("desc").collect();
    const live = stories.filter((s) => s.expiry > now);
    const groups: Record<string, { userId: typeof stories[number]["userId"]; items: unknown[] }> = {};
    for (const s of live) {
      if (!groups[s.userId]) groups[s.userId] = { userId: s.userId, items: [] };
      groups[s.userId].items.push({ ...s, url: await ctx.storage.getUrl(s.storageId) });
    }
    return Promise.all(
      Object.values(groups).map(async (g) => ({
        ...g,
        user: await ctx.db.get(g.userId),
      }))
    );
  },
});

export const create = mutation({
  args: { storageId: v.id("_storage"), caption: v.optional(v.string()) },
  handler: async (ctx, { storageId, caption }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await ctx.db.insert("stories", {
      userId,
      storageId,
      caption,
      expiry: Date.now() + 24 * 60 * 60 * 1000,
    });
  },
});
