import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
});

// Concept schema
export const concepts = pgTable("concepts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  domain: text("domain").notNull(),
  difficulty: text("difficulty").notNull(), // beginner, intermediate, advanced
  description: text("description").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertConceptSchema = createInsertSchema(concepts).pick({
  name: true,
  domain: true,
  difficulty: true,
  description: true,
});

// Concept relationships schema
export const conceptRelationships = pgTable("concept_relationships", {
  id: serial("id").primaryKey(),
  sourceId: integer("source_id").notNull().references(() => concepts.id),
  targetId: integer("target_id").notNull().references(() => concepts.id),
  relationshipType: text("relationship_type").notNull(), // prerequisite, related, etc.
  strength: integer("strength").notNull(), // 1-10
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertConceptRelationshipSchema = createInsertSchema(conceptRelationships).pick({
  sourceId: true,
  targetId: true,
  relationshipType: true,
  strength: true,
});

// User progress schema
export const userProgress = pgTable("user_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  conceptId: integer("concept_id").notNull().references(() => concepts.id),
  isLearned: boolean("is_learned").notNull().default(false),
  learnedAt: timestamp("learned_at"),
});

export const insertUserProgressSchema = createInsertSchema(userProgress).pick({
  userId: true,
  conceptId: true,
  isLearned: true,
  learnedAt: true,
});

// Chat messages schema
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  conceptId: integer("concept_id").notNull().references(() => concepts.id),
  message: text("message").notNull(),
  isUser: boolean("is_user").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).pick({
  userId: true,
  conceptId: true,
  message: true,
  isUser: true,
});

// Types for all schemas
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Concept = typeof concepts.$inferSelect;
export type InsertConcept = z.infer<typeof insertConceptSchema>;

export type ConceptRelationship = typeof conceptRelationships.$inferSelect;
export type InsertConceptRelationship = z.infer<typeof insertConceptRelationshipSchema>;

export type UserProgress = typeof userProgress.$inferSelect;
export type InsertUserProgress = z.infer<typeof insertUserProgressSchema>;

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
