import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const rows = await ctx.db
      .query("notifications")
      .withIndex("recipientId", (q) => q.eq("recipientId", userId))
      .order("desc")
      .take(50);
    return Promise.all(
      rows.map(async (n) => ({ ...n, sender: await ctx.db.get(n.senderId) }))
    );
  },
});

export const unreadCount = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return 0;
    const rows = await ctx.db
      .query("notifications")
      .withIndex("recipientId", (q) => q.eq("recipientId", userId))
      .collect();
    return rows.filter((n) => !n.read).length;
  },
});

export const markAllRead = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;
    const rows = await ctx.db
      .query("notifications")
      .withIndex("recipientId", (q) => q.eq("recipientId", userId))
      .collect();
    for (const n of rows) {
      if (!n.read) await ctx.db.patch(n._id, { read: true });
    }
  },
});
