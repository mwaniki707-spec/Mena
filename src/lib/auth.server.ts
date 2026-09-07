import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { flushDatabase, getDatabase } from "./db.server";
import { validateEmail, validateName, validatePassword } from "./auth-validation";

const sessionDurationMs = 1000 * 60 * 60 * 24 * 7; // 7 days

export type User = {
  id: number;
  email: string;
  name: string;
  googleId?: string | null;
};

export function createUser({ email, name, password }: { email: string; name: string; password?: string }) {
  const emailValid = validateEmail(email);
  if (!emailValid.valid) {
    throw new Error(emailValid.error || "Invalid email");
  }

  const nameValid = validateName(name);
  if (!nameValid.valid) {
    throw new Error(nameValid.error || "Invalid name");
  }

  if (password !== undefined) {
    const passwordValid = validatePassword(password);
    if (!passwordValid.valid) {
      throw new Error(passwordValid.error || "Invalid password");
    }
  }

  const db = getDatabase();
  const hashedPassword = password ? bcrypt.hashSync(password, 10) : null;
  const now = Date.now();

  db.run(
    `INSERT INTO users (email, name, password_hash, google_id, created_at, updated_at)
     VALUES (?, ?, ?, NULL, ?, ?)`,
    [email.toLowerCase().trim(), name.trim(), hashedPassword, now, now],
  );

  const res = db.exec("SELECT last_insert_rowid() as id");
  const lastId = res[0].values[0][0] as number;
  flushDatabase();

  const user = getUserById(lastId);
  if (!user) throw new Error("Failed to retrieve created user");
  return user;
}

export function getUserByEmail(email: string): User | undefined {
  if (!email) return undefined;
  const db = getDatabase();
  const stmt = db.prepare("SELECT id, email, name, google_id as googleId FROM users WHERE lower(email) = lower(?)");
  const row = stmt.getAsObject([email.toLowerCase().trim()]);
  stmt.free();
  if (!row || row.id === undefined) return undefined;
  return {
    id: Number(row.id),
    email: String(row.email),
    name: String(row.name),
    googleId: row.googleId ? String(row.googleId) : null,
  };
}

export function getUserByGoogleId(googleId: string): User | undefined {
  if (!googleId) return undefined;
  const db = getDatabase();
  const stmt = db.prepare("SELECT id, email, name, google_id as googleId FROM users WHERE google_id = ?");
  const row = stmt.getAsObject([googleId]);
  stmt.free();
  if (!row || row.id === undefined) return undefined;
  return {
    id: Number(row.id),
    email: String(row.email),
    name: String(row.name),
    googleId: row.googleId ? String(row.googleId) : null,
  };
}

export function getUserById(id: number): User | undefined {
  if (!id) return undefined;
  const db = getDatabase();
  const stmt = db.prepare("SELECT id, email, name, google_id as googleId FROM users WHERE id = ?");
  const row = stmt.getAsObject([id]);
  stmt.free();
  if (!row || row.id === undefined) return undefined;
  return {
    id: Number(row.id),
    email: String(row.email),
    name: String(row.name),
    googleId: row.googleId ? String(row.googleId) : null,
  };
}

export function verifyUserCredentials(email: string, password: string): User | null {
  if (!email || !password) return null;
  const db = getDatabase();
  const stmt = db.prepare(
    "SELECT id, email, name, password_hash, google_id as googleId FROM users WHERE lower(email) = lower(?)",
  );
  const row = stmt.getAsObject([email.toLowerCase().trim()]);
  stmt.free();

  if (!row || row.id === undefined || !row.password_hash) return null;

  const matches = bcrypt.compareSync(password, String(row.password_hash));
  if (!matches) return null;

  return {
    id: Number(row.id),
    email: String(row.email),
    name: String(row.name),
    googleId: row.googleId ? String(row.googleId) : null,
  };
}

export function createSession(userId: number) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = Date.now() + sessionDurationMs;
  const db = getDatabase();
  db.run("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)", [token, userId, expiresAt]);
  flushDatabase();
  return { token, expiresAt };
}

export function getSession(token: string) {
  if (!token) return null;
  const db = getDatabase();
  const stmt = db.prepare(
    `SELECT s.token, s.expires_at, u.id as user_id, u.email, u.name, u.google_id as googleId
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token = ? AND s.expires_at > ?`,
  );
  const row = stmt.getAsObject([token, Date.now()]);
  stmt.free();

  if (!row || row.token === undefined || !row.user_id) return null;

  return {
    token: String(row.token),
    expiresAt: Number(row.expires_at),
    user: {
      id: Number(row.user_id),
      email: String(row.email),
      name: String(row.name),
      googleId: row.googleId ? String(row.googleId) : null,
    },
  };
}

export function revokeSession(token: string) {
  if (!token) return;
  const db = getDatabase();
  db.run("DELETE FROM sessions WHERE token = ?", [token]);
  flushDatabase();
}

export function upsertGoogleUser({ email, name, googleId }: { email: string; name: string; googleId: string }) {
  const existing = getUserByGoogleId(googleId);
  if (existing) return existing;

  const db = getDatabase();
  const now = Date.now();
  db.run(
    `INSERT INTO users (email, name, password_hash, google_id, created_at, updated_at)
     VALUES (?, ?, NULL, ?, ?, ?)`,
    [email.toLowerCase().trim(), name.trim(), googleId, now, now],
  );

  const res = db.exec("SELECT last_insert_rowid() as id");
  const lastId = res[0].values[0][0] as number;
  flushDatabase();

  const user = getUserById(lastId);
  if (!user) throw new Error("Failed to retrieve created Google user");
  return user;
}

export function updateUserProfile(userId: number, { name }: { name: string }) {
  const nameValid = validateName(name);
  if (!nameValid.valid) {
    throw new Error(nameValid.error || "Invalid name");
  }
  const db = getDatabase();
  const now = Date.now();
  db.run("UPDATE users SET name = ?, updated_at = ? WHERE id = ?", [name.trim(), now, userId]);
  flushDatabase();
  const user = getUserById(userId);
  if (!user) throw new Error("User not found");
  return user;
}

export function changeUserPassword(userId: number, { currentPassword, newPassword }: { currentPassword?: string; newPassword: string }) {
  const user = getUserById(userId);
  if (!user) throw new Error("User not found");

  const db = getDatabase();
  const stmt = db.prepare("SELECT password_hash FROM users WHERE id = ?");
  const row = stmt.getAsObject([userId]);
  stmt.free();

  if (row.password_hash && currentPassword) {
    const matches = bcrypt.compareSync(currentPassword, String(row.password_hash));
    if (!matches) throw new Error("Current password is incorrect");
  }

  const passwordValid = validatePassword(newPassword);
  if (!passwordValid.valid) {
    throw new Error(passwordValid.error || "Invalid password");
  }

  const hashedPassword = bcrypt.hashSync(newPassword, 10);
  const now = Date.now();
  db.run("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?", [hashedPassword, now, userId]);
  flushDatabase();
  return { success: true };
}

export function createPasswordResetToken(email: string) {
  const user = getUserByEmail(email);
  if (!user) {
    // Return dummy token without throwing so we don't leak account existence
    return { token: randomBytes(16).toString("hex"), expiresAt: Date.now() + 1000 * 60 * 60 };
  }
  const token = randomBytes(32).toString("hex");
  const expiresAt = Date.now() + 1000 * 60 * 60; // 1 hour
  const db = getDatabase();
  db.run("INSERT OR REPLACE INTO reset_tokens (token, user_id, expires_at) VALUES (?, ?, ?)", [token, user.id, expiresAt]);
  flushDatabase();
  return { token, expiresAt };
}

export function resetPasswordWithToken(token: string, newPassword: string) {
  const db = getDatabase();
  const stmt = db.prepare("SELECT token, user_id, expires_at FROM reset_tokens WHERE token = ? AND expires_at > ?");
  const row = stmt.getAsObject([token, Date.now()]);
  stmt.free();

  if (!row || row.token === undefined || !row.user_id) {
    throw new Error("Invalid or expired password reset token");
  }

  const userId = Number(row.user_id);
  const passwordValid = validatePassword(newPassword);
  if (!passwordValid.valid) {
    throw new Error(passwordValid.error || "Invalid new password");
  }

  const hashedPassword = bcrypt.hashSync(newPassword, 10);
  const now = Date.now();
  db.run("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?", [hashedPassword, now, userId]);
  db.run("DELETE FROM reset_tokens WHERE token = ?", [token]);
  flushDatabase();
  return { success: true };
}
