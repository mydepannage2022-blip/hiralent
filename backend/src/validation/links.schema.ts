import { z } from "zod";

export const socialLinkSchema = z.object({
  platform: z
    .enum(["github", "linkedin", "portfolio", "twitter", "behance", "dribbble", "other", "email"])
    .default("other"),
  url: z.string().min(1, "url is required"),
  display_name: z.string().optional(),
});

export const updateLinksSchema = z.object({
  links: z.array(socialLinkSchema).default([]),
});

export const addLinkSchema = socialLinkSchema;
