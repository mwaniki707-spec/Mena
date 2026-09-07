import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createSession, createUser, getSession, getUserByEmail, revokeSession, upsertGoogleUser, verifyUserCredentials, type User } from "./auth.server";
import { getServerConfig } from "./config.server";

import { validateEmail, validateName, validatePassword } from "./auth-validation";

const authCookieName = "mena_auth_token";
const authCookieOptions = {
  path: "/",
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
};

function getAuthHeader(request: Request) {
  return request.headers.get("authorization")?.replace(/^Bearer\s+/, "") ?? null;
}

export const signup = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({ email: z.string(), name: z.string(), password: z.string() }),
  )
  .handler(async ({ data }) => {
    const emailCheck = validateEmail(data.email);
    if (!emailCheck.valid) throw new Error(emailCheck.error);

    const nameCheck = validateName(data.name);
    if (!nameCheck.valid) throw new Error(nameCheck.error);

    const passCheck = validatePassword(data.password);
    if (!passCheck.valid) throw new Error(passCheck.error);

    const existing = getUserByEmail(data.email);
    if (existing) {
      throw new Error("User already exists with this email");
    }
    const user = createUser({ email: data.email, name: data.name, password: data.password });
    if (!user) throw new Error("Failed to create user");
    const session = createSession(user!.id);
    return { user, session };
  });

export const signin = createServerFn({ method: "POST" })
  .inputValidator(z.object({ email: z.string().email(), password: z.string().min(8) }))
  .handler(async ({ data }) => {
    const user = verifyUserCredentials(data.email, data.password);
    if (!user) {
      throw new Error("Invalid email or password");
    }
    const session = createSession(user!.id);
    return { user, session };
  });

export const signout = createServerFn({ method: "POST" }).handler(async (ctx: any) => {
  const request = ctx.request as Request | undefined;
  const token = request ? getAuthHeader(request) ?? "" : "";
  revokeSession(token);
  return { success: true };
});

export const getCurrentUser = createServerFn({ method: "GET" })
  .handler(async (ctx: any) => {
    const request = ctx.request as Request | undefined;
    const token = request ? getAuthHeader(request) ?? "" : "";
    const session = getSession(token);
    return { user: session?.user ?? null };
  });

export const oauthCallback = createServerFn({ method: "POST" })
  .inputValidator(z.object({ idToken: z.string() }))
  .handler(async ({ data }) => {
    const payload = JSON.parse(Buffer.from(data.idToken.split(".")[1], "base64").toString("utf-8"));
    const email = payload.email as string;
    const name = payload.name as string;
    const googleId = payload.sub as string;
    if (!email || !name || !googleId) {
      throw new Error("Invalid Google token payload");
    }
    const user = upsertGoogleUser({ email, name, googleId });
    if (!user) throw new Error("Failed to create or find Google user");
    const session = createSession(user!.id);
    return { user, session };
  });
