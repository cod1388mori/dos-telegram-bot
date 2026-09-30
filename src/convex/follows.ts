import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const toggle = mutation({
  args: { targetId: v.id("users") },
  handler: async (ctx, { targetId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    if (userId === targetId) throw new Error("نمی‌توان خودت را دنبال کرد");
    const existing = await ctx.db
      .query("follows")
      .withIndex("followerId", (q) => q.eq("followerId", userId))
      .filter((q) => q.eq(q.field("followingId"), targetId))
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
      return false;
    }
    await ctx.db.insert("follows", { followerId: userId, followingId: targetId });
    await ctx.db.insert("notifications", {
      recipientId: targetId,
      senderId: userId,
      kind: "follow",
      read: false,
    });
    return true;
  },
});

export const isFollowing = query({
  args: { targetId: v.id("users") },
  handler: async (ctx, { targetId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return false;
    const row = await ctx.db
      .query("follows")
      .withIndex("followerId", (q) => q.eq("followerId", userId))
      .filter((q) => q.eq(q.field("followingId"), targetId))
      .first();
    return !!row;
  },
});

export const counts = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const followers = await ctx.db
      .query("follows")
      .withIndex("followingId", (q) => q.eq("followingId", userId))
      .collect();
    const following = await ctx.db
      .query("follows")
      .withIndex("followerId", (q) => q.eq("followerId", userId))
      .collect();
    return { followers: followers.length, following: following.length };
  },
});
