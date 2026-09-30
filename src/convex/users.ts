import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const current = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db.get(userId);
  },
});

export const search = query({
  args: { q: v.string() },
  handler: async (ctx, { q }) => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    const all = await ctx.db.query("users").collect();
    return all
      .filter((u) => {
        const un = (u.username ?? "").toLowerCase();
        const fn = (u.fullname ?? u.name ?? "").toLowerCase();
        return un.includes(term) || fn.includes(term);
      })
      .slice(0, 8);
  },
});

export const listByUsername = query({
  args: { username: v.string() },
  handler: async (ctx, { username }) => {
    const all = await ctx.db.query("users").collect();
    return all.find((u) => (u.username ?? "").toLowerCase() === username.toLowerCase()) ?? null;
  },
});

export const getByIds = query({
  args: { ids: v.array(v.id("users")) },
  handler: async (ctx, { ids }) => {
    const out = [];
    for (const id of ids) {
      const u = await ctx.db.get(id);
      if (u) out.push(u);
    }
    return out;
  },
});

export const updateProfile = mutation({
  args: { username: v.string(), fullname: v.string(), bio: v.string() },
  handler: async (ctx, { username, fullname, bio }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const clean = username.trim().toLowerCase().replace(/[^a-z0-9._]/g, "");
    if (clean.length < 3) throw new Error("نام کاربری باید حداقل ۳ کاراکتر باشد");
    const existing = await ctx.db
      .query("users")
      .withIndex("username", (q) => q.eq("username", clean))
      .first();
    if (existing && existing._id !== userId) throw new Error("این نام کاربری قبلاً گرفته شده");
    await ctx.db.patch(userId, { username: clean, fullname: fullname.trim(), bio: bio.trim() });
    return clean;
  },
});

export const setImage = mutation({
  args: { image: v.string() },
  handler: async (ctx, { image }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await ctx.db.patch(userId, { image });
  },
});
