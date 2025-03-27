import { pgTable, text, serial, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

// Animation presets schema
export const animationPresets = pgTable("animation_presets", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  userId: integer("user_id").references(() => users.id),
  isPublic: boolean("is_public").default(false),
  animation: jsonb("animation").notNull(),
  icon: text("icon").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPresetSchema = createInsertSchema(animationPresets).pick({
  name: true,
  category: true,
  userId: true,
  isPublic: true,
  animation: true,
  icon: true,
});

// Animation projects schema
export const animationProjects = pgTable("animation_projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  userId: integer("user_id").references(() => users.id),
  data: jsonb("data").notNull(),
  thumbnail: text("thumbnail"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertProjectSchema = createInsertSchema(animationProjects).pick({
  name: true,
  userId: true,
  data: true,
  thumbnail: true,
});

// Define types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertPreset = z.infer<typeof insertPresetSchema>;
export type AnimationPreset = typeof animationPresets.$inferSelect;

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type AnimationProject = typeof animationProjects.$inferSelect;

// Animation types schema
export const animationTypes = [
  'None',
  'Fade',
  'Slide',
  'Scale',
  'Rotate',
  'Bounce',
  'Pulse',
  'Custom'
];

export const easingTypes = [
  'Linear',
  'Ease In',
  'Ease Out',
  'Ease In Out',
  'Bounce',
  'Custom'
];

// Animation validation schema
export const animationSchema = z.object({
  type: z.enum(animationTypes as [string, ...string[]]),
  startTime: z.number().optional(),
  duration: z.number().min(0),
  delay: z.number().min(0).optional(),
  easing: z.enum(easingTypes as [string, ...string[]]),
  direction: z.string().optional(),
  opacity: z.number().min(0).max(100).optional(),
  scale: z.number().optional(),
  rotation: z.number().optional(),
  positionOverride: z.boolean().optional(),
  position: z.object({
    x: z.number(),
    y: z.number()
  }).optional(),
  customData: z.record(z.any()).optional()
});

// Export options validation schema
export const exportGifOptionsSchema = z.object({
  frames: z.array(z.any()),
  width: z.number().positive(),
  height: z.number().positive(),
  quality: z.number().min(0).max(1),
  dithering: z.enum(['none', 'pattern', 'diffusion']).optional(),
  colorDepth: z.union([z.literal(8), z.literal(16), z.literal(24)]).optional(),
  disposal: z.enum(['none', 'background', 'previous']).optional(),
  delay: z.number().optional(), // In milliseconds, special client format uses 2500ms
  loop: z.union([z.number(), z.boolean()]).optional()
});

export const exportHtmlOptionsSchema = z.object({
  frames: z.array(z.any()),
  width: z.number().positive(),
  height: z.number().positive(),
  includeClickTag: z.boolean().optional(),
  optimizeForAdNetworks: z.boolean().optional(),
  generateFallback: z.boolean().optional(),
  adPlatform: z.enum(['google', 'meta', 'generic']).optional()
});

export const exportMp4OptionsSchema = z.object({
  frames: z.array(z.any()),
  width: z.number().positive(),
  height: z.number().positive(),
  fps: z.number().min(15).max(60),
  videoBitrate: z.number().min(1000).max(10000),
  codec: z.enum(['h264']).default('h264')
});

export const exportWebmOptionsSchema = z.object({
  frames: z.array(z.any()),
  width: z.number().positive(),
  height: z.number().positive(),
  fps: z.number().min(15).max(60),
  videoBitrate: z.number().min(1000).max(10000),
  codec: z.enum(['vp9']).default('vp9'),
  transparent: z.boolean().optional()
});
