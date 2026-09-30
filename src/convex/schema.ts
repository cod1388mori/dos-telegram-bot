import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,
  users: defineTable({
    name: v.string(),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    image: v.optional(v.string()),
    isAnonymous: v.optional(v.boolean()),
    username: v.optional(v.string()),
    fullname: v.optional(v.string()),
    bio: v.optional(v.string()),
  })
    .index("email", ["email"])
    .index("username", ["username"]),

  posts: defineTable({
    userId: v.id("users"),
    storageId: v.id("_storage"),
    caption: v.optional(v.string()),
    likes: v.number(),
    comments: v.number(),
  }).index("userId", ["userId"]),

  likes: defineTable({
    userId: v.id("users"),
    postId: v.id("posts"),
  })
    .index("userId", ["userId"])
    .index("postId", ["postId"]),

  comments: defineTable({
    userId: v.id("users"),
    postId: v.id("posts"),
    body: v.string(),
  })
    .index("postId", ["postId"])
    .index("userId", ["userId"]),

  follows: defineTable({
    followerId: v.id("users"),
    followingId: v.id("users"),
  })
    .index("followerId", ["followerId"])
    .index("followingId", ["followingId"]),

  stories: defineTable({
    userId: v.id("users"),
    storageId: v.id("_storage"),
    caption: v.optional(v.string()),
    expiry: v.number(),
  }).index("userId", ["userId"]),

  notifications: defineTable({
    recipientId: v.id("users"),
    senderId: v.id("users"),
    postId: v.optional(v.id("posts")),
    kind: v.union(v.literal("like"), v.literal("comment"), v.literal("follow")),
    read: v.boolean(),
  }).index("recipientId", ["recipientId"]),
});
