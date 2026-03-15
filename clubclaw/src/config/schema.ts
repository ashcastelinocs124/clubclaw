import { z } from 'zod';

export const RoleSchema = z.object({
  name: z.string(),
  emoji: z.string(),
  description: z.string().optional(),
});

export const VerificationSchema = z.object({
  enabled: z.boolean().default(false),
  method: z.enum(['reaction', 'button', 'command']).default('reaction'),
  role: z.string(),
});

export const OnboardingSchema = z.object({
  welcome_channel: z.string(),
  welcome_message: z.string(),
  verification: VerificationSchema.optional(),
  roles: z.array(RoleSchema).default([]),
});

export const ChannelDefSchema = z.object({
  name: z.string(),
  access: z.array(z.string()).default([]),
});

export const CategorySchema = z.object({
  name: z.string(),
  channels: z.array(ChannelDefSchema).default([]),
});

export const AutoArchiveSchema = z.object({
  enabled: z.boolean().default(false),
  inactive_days: z.number().default(30),
});

export const ChannelsSchema = z.object({
  categories: z.array(CategorySchema).default([]),
  auto_archive: AutoArchiveSchema.optional(),
});

export const ScheduledMessageSchema = z.object({
  message: z.string(),
  cron: z.string(),
});

export const AnnouncementsSchema = z.object({
  channel: z.string(),
  scheduled: z.array(ScheduledMessageSchema).default([]),
});

export const AiSchema = z.object({
  enabled: z.boolean().default(false),
  provider: z.enum(['anthropic', 'openai']).default('anthropic'),
  features: z.array(z.string()).default([]),
});

export const ConfigSchema = z.object({
  org: z.object({
    name: z.string(),
    description: z.string().optional(),
  }),
  discord: z.object({
    token: z.string(),
    guild_id: z.string(),
  }),
  onboarding: OnboardingSchema.optional(),
  channels: ChannelsSchema.optional(),
  announcements: AnnouncementsSchema.optional(),
  ai: AiSchema.optional(),
});

export type ClubClawConfig = z.infer<typeof ConfigSchema>;
