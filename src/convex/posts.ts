import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const feed = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    const posts = await ctx.db.query("posts").order("desc").take(30);
    return Promise.all(
      posts.map(async (post) => {
        const author = await ctx.db.get(post.userId);
        const url = await ctx.storage.getUrl(post.storageId);
        const liked = userId
          ? !!(await ctx.db
              .query("likes")
              .withIndex("postId", (q) => q.eq("postId", post._id))
              .filter((q) => q.eq(q.field("userId"), userId))
              .first())
          : false;
        return { ...post, url, author, liked };
      })
    );
  },
});

export const byUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const posts = await ctx.db
      .query("posts")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
    return Promise.all(
      posts.map(async (post) => ({
        ...post,
        url: await ctx.storage.getUrl(post.storageId),
      }))
    );
  },
});

export const get = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, { postId }) => {
    const post = await ctx.db.get(postId);
    if (!post) return null;
    const url = await ctx.storage.getUrl(post.storageId);
    const author = await ctx.db.get(post.userId);
    return { ...post, url, author };
  },
});

export const create = mutation({
  args: { storageId: v.id("_storage"), caption: v.optional(v.string()) },
  handler: async (ctx, { storageId, caption }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.db.insert("posts", { userId, storageId, caption, likes: 0, comments: 0 });
  },
});

export const remove = mutation({
  args: { postId: v.id("posts") },
  handler: async (ctx, { postId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const post = await ctx.db.get(postId);
    if (!post || post.userId !== userId) throw new Error("Only the author can delete this post");
    const comments = await ctx.db
      .query("comments")
      .withIndex("postId", (q) => q.eq("postId", postId))
      .collect();
    for (const c of comments) await ctx.db.delete(c._id);
    const likes = await ctx.db
      .query("likes")
      .withIndex("postId", (q) => q.eq("postId", postId))
      .collect();
    for (const l of likes) await ctx.db.delete(l._id);
    await ctx.storage.delete(post.storageId);
    await ctx.db.delete(postId);
  },
});

export const toggleLike = mutation({
  args: { postId: v.id("posts") },
  handler: async (ctx, { postId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const post = await ctx.db.get(postId);
    if (!post) throw new Error("Post not found");
    const existing = await ctx.db
      .query("likes")
      .withIndex("postId", (q) => q.eq("postId", postId))
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
      await ctx.db.patch(postId, { likes: Math.max(0, post.likes - 1) });
      return false;
    }
    await ctx.db.insert("likes", { userId, postId });
    await ctx.db.patch(postId, { likes: post.likes + 1 });
    if (post.userId !== userId) {
      await ctx.db.insert("notifications", {
        recipientId: post.userId,
        senderId: userId,
        postId,
        kind: "like",
        read: false,
      });
    }
    return true;
  },
});

export const addComment = mutation({
  args: { postId: v.id("posts"), body: v.string() },
  handler: async (ctx, { postId, body }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const text = body.trim();
    if (!text) throw new Error("متن کامنت خالی است");
    const post = await ctx.db.get(postId);
    if (!post) throw new Error("Post not found");
    await ctx.db.insert("comments", { userId, postId, body: text });
    await ctx.db.patch(postId, { comments: post.comments + 1 });
    if (post.userId !== userId) {
      await ctx.db.insert("notifications", {
        recipientId: post.userId,
        senderId: userId,
        postId,
        kind: "comment",
        read: false,
      });
    }
  },
});

export const listComments = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, { postId }) => {
    const comments = await ctx.db
      .query("comments")
      .withIndex("postId", (q) => q.eq("postId", postId))
      .order("asc")
      .collect();
    return Promise.all(
      comments.map(async (c) => ({
        ...c,
        author: await ctx.db.get(c.userId),
      }))
    );
  },
});
