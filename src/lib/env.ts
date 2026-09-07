/**
 * Typed access to Vite environment variables.
 * Values are injected at build time from the .env file — never committed to git.
 */
export const KIMI_API_KEY: string | undefined =
  import.meta.env.VITE_KIMI_API_KEY || undefined;

export const KIMI_BASE_URL = "https://api.moonshot.ai/v1";
