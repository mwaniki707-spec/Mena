import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import {
  changeUserPassword,
  createPasswordResetToken,
  createSession,
  createUser,
  getSession,
  getUserByEmail,
  resetPasswordWithToken,
  revokeSession,
  updateUserProfile,
  upsertGoogleUser,
  verifyUserCredentials,
} from "./lib/auth.server";
import { validateEmail, validateName, validatePassword } from "./lib/auth-validation";

const rateLimitMap = new Map<string, { count: number; expiresAt: number }>();
function checkRateLimit(key: string, limit = 15, windowMs = 60 * 1000): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || entry.expiresAt < now) {
    rateLimitMap.set(key, { count: 1, expiresAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count += 1;
  return true;
}

const authCookieName = "mena_auth_token";
const authCookieOptions = `Path=/; HttpOnly; SameSite=Lax${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function parseCookies(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  return Object.fromEntries(
    cookieHeader
      .split(";")
      .map((cookie) => cookie.trim().split("=") as [string, string])
      .filter(([name]) => name)
      .map(([name, value]) => [name, decodeURIComponent(value)]),
  );
}

function createAuthCookie(token: string) {
  return `${authCookieName}=${token}; ${authCookieOptions}; Max-Age=${60 * 60 * 24 * 7}`;
}

function clearAuthCookie() {
  return `${authCookieName}=; ${authCookieOptions}; Max-Age=0`;
}

async function handleAuthRoutes(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/auth")) {
    return null;
  }

  const normalizedPathname = url.pathname.replace(/\/+$/, "");
  // Allow auth page routes to be handled by the React router.
  if (
    request.method === "GET" &&
    (normalizedPathname === "/auth" || normalizedPathname === "/auth/callback")
  ) {
    return null;
  }

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/, "") ?? parseCookies(request)[authCookieName];
  const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "client";

  if (request.method === "POST" && !checkRateLimit(`${clientIp}:${normalizedPathname}`, 10, 60 * 1000)) {
    return new Response(JSON.stringify({ message: "Too many requests. Please wait a minute before trying again." }), {
      status: 429,
      headers: { "content-type": "application/json" },
    });
  }

  // Basic CSRF Protection for state-changing requests
  if (request.method !== "GET" && request.method !== "HEAD" && request.method !== "OPTIONS") {
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");
    if (origin && host) {
      try {
        const originHost = new URL(origin).host;
        if (originHost !== host) {
          return new Response(JSON.stringify({ message: "Cross-site request forgery protection triggered." }), {
            status: 403,
            headers: { "content-type": "application/json" },
          });
        }
      } catch {
        // invalid origin header
      }
    }
  }

  if (normalizedPathname === "/auth/signup" && request.method === "POST") {
    try {
      const data = await request.json();

      const emailCheck = validateEmail(data.email);
      if (!emailCheck.valid) {
        return new Response(JSON.stringify({ message: emailCheck.error }), {
          status: 400,
          headers: { "content-type": "application/json" },
        });
      }

      const nameCheck = validateName(data.name);
      if (!nameCheck.valid) {
        return new Response(JSON.stringify({ message: nameCheck.error }), {
          status: 400,
          headers: { "content-type": "application/json" },
        });
      }

      const passwordCheck = validatePassword(data.password);
      if (!passwordCheck.valid) {
        return new Response(JSON.stringify({ message: passwordCheck.error }), {
          status: 400,
          headers: { "content-type": "application/json" },
        });
      }

      const existing = getUserByEmail(data.email);
      if (existing) {
        return new Response(JSON.stringify({ message: "User already exists with this email" }), {
          status: 400,
          headers: { "content-type": "application/json" },
        });
      }

      const user = createUser({ email: data.email, name: data.name, password: data.password });
      const session = createSession(user.id);
      return new Response(JSON.stringify({ user, session }), {
        status: 200,
        headers: {
          "content-type": "application/json",
          "set-cookie": createAuthCookie(session.token),
        },
      });
    } catch (err) {
      return new Response(
        JSON.stringify({ message: err instanceof Error ? err.message : "Signup failed" }),
        {
          status: 400,
          headers: { "content-type": "application/json" },
        },
      );
    }
  }

  if (normalizedPathname === "/auth/signin" && request.method === "POST") {
    const data = await request.json();
    const user = verifyUserCredentials(data.email, data.password);
    if (!user) {
      return new Response(JSON.stringify({ message: "Invalid email or password" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }
    const session = createSession(user.id);
    return new Response(JSON.stringify({ user, session }), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "set-cookie": createAuthCookie(session.token),
      },
    });
  }

  if (normalizedPathname === "/auth/forgot-password" && request.method === "POST") {
    const data = await request.json();
    const { token: resetToken } = createPasswordResetToken(data.email);
    if (process.env.NODE_ENV !== "production") {
      console.log(`[DEV ONLY] Password reset token for ${data.email}: ${resetToken}`);
    }
    return new Response(
      JSON.stringify({
        message: "If an account exists with that email address, password reset instructions have been generated.",
        // Do not return resetToken in response for security; log in dev or send via email in production.
        ...(process.env.NODE_ENV !== "production" ? { devResetToken: resetToken } : {}),
      }),
      {
        status: 200,
        headers: { "content-type": "application/json" },
      },
    );
  }

  if (normalizedPathname === "/auth/reset-password" && request.method === "POST") {
    try {
      const data = await request.json();
      resetPasswordWithToken(data.token, data.newPassword);
      return new Response(JSON.stringify({ message: "Password updated successfully" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    } catch (err) {
      return new Response(JSON.stringify({ message: err instanceof Error ? err.message : "Failed to reset password" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }
  }

  if (normalizedPathname === "/auth/update-profile" && request.method === "POST") {
    const session = token ? getSession(token) : null;
    if (!session) {
      return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401, headers: { "content-type": "application/json" } });
    }
    try {
      const data = await request.json();
      const updatedUser = updateUserProfile(session.user.id, { name: data.name });
      return new Response(JSON.stringify({ user: updatedUser }), { status: 200, headers: { "content-type": "application/json" } });
    } catch (err) {
      return new Response(JSON.stringify({ message: err instanceof Error ? err.message : "Failed to update profile" }), { status: 400, headers: { "content-type": "application/json" } });
    }
  }

  if (normalizedPathname === "/auth/change-password" && request.method === "POST") {
    const session = token ? getSession(token) : null;
    if (!session) {
      return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401, headers: { "content-type": "application/json" } });
    }
    try {
      const data = await request.json();
      changeUserPassword(session.user.id, { currentPassword: data.currentPassword, newPassword: data.newPassword });
      return new Response(JSON.stringify({ message: "Password updated successfully" }), { status: 200, headers: { "content-type": "application/json" } });
    } catch (err) {
      return new Response(JSON.stringify({ message: err instanceof Error ? err.message : "Failed to change password" }), { status: 400, headers: { "content-type": "application/json" } });
    }
  }

  if (normalizedPathname === "/auth/signout" && request.method === "POST") {
    if (token) revokeSession(token);
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "set-cookie": clearAuthCookie(),
      },
    });
  }

  if (normalizedPathname === "/auth/user" && request.method === "GET") {
    const session = token ? getSession(token) : null;
    return new Response(JSON.stringify({ user: session?.user ?? null }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  if (normalizedPathname === "/auth/oauth-callback" && request.method === "POST") {
    const data = await request.json();
    const idToken = data.idToken as string | undefined;
    if (!idToken) {
      return new Response(JSON.stringify({ message: "Missing idToken" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    try {
      // Verify token with Google's public tokeninfo endpoint
      const verifyRes = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
      );
      if (!verifyRes.ok) {
        throw new Error("Invalid or unverified Google token");
      }
      const payload = await verifyRes.json();
      const email = payload.email as string | undefined;
      const name = (payload.name || payload.email?.split("@")[0] || "Google User") as string;
      const googleId = payload.sub as string | undefined;

      if (!email || !googleId) {
        return new Response(JSON.stringify({ message: "Invalid Google token payload" }), {
          status: 400,
          headers: { "content-type": "application/json" },
        });
      }

      const user = upsertGoogleUser({ email, name, googleId });
      const session = createSession(user.id);
      return new Response(JSON.stringify({ user, session }), {
        status: 200,
        headers: {
          "content-type": "application/json",
          "set-cookie": createAuthCookie(session.token),
        },
      });
    } catch (err) {
      return new Response(
        JSON.stringify({ message: err instanceof Error ? err.message : "OAuth verification failed" }),
        {
          status: 400,
          headers: { "content-type": "application/json" },
        },
      );
    }
  }

  return new Response(JSON.stringify({ message: "Not found" }), {
    status: 404,
    headers: { "content-type": "application/json" },
  });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const authResponse = await handleAuthRoutes(request);
      if (authResponse) return authResponse;

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
