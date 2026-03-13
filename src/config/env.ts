import { z } from "zod";

const envSchema = z.object({
  PACKAGE_NAME: z.string().min(1),
  MENTRAOS_API_KEY: z.string().min(1),
  COOKIE_SECRET: z.string().min(8).default("default_secret_please_change_in_production_12345"),
  PORT: z.string().transform((val) => parseInt(val, 10)).pipe(z.number()).default(3000),
  MENTRA_INTERNAL_PORT: z.string().transform((val) => parseInt(val, 10)).pipe(z.number()).default(3099),
  MCP_USER_TOKENS: z.string().transform((val) => {
    try {
      return JSON.parse(val);
    } catch {
      return {};
    }
  }).default("{}"),
  MCP_ADMIN_TOKEN: z.string().optional(),
  DEBUG: z.string().transform((val) => val === "true" || val === "1").pipe(z.boolean()).default(false),
});

// Validate and export
const env = envSchema.parse(process.env);

export const config = {
  packageName: env.PACKAGE_NAME,
  apiKey: env.MENTRAOS_API_KEY,
  cookieSecret: env.COOKIE_SECRET,
  port: env.PORT,
  internalPort: env.MENTRA_INTERNAL_PORT,
  userTokens: env.MCP_USER_TOKENS as Record<string, string>,
  adminToken: env.MCP_ADMIN_TOKEN,
  debug: env.DEBUG,
};

// Secure debug logger - never logs sensitive data
export function debugLog(...args: any[]) {
  if (config.debug) {
    console.log("[DEBUG]", ...args);
  }
}
