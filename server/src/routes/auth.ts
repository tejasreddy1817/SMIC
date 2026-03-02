import express from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { User } from "../models/User";
import { AuditLog } from "../models/AuditLog";
import { Otp } from "../models/Otp";
import { ensureAuth, ensurePermission, auditSensitive, AuthRequest } from "../middleware/auth";
import { roleHasPermission } from "../utils/rbac";
import { assertCanAssignRole } from "../services/permission.service";
import { buildAuthUrl, createState, consumeState, exchangeCodeForToken, fetchProfile, linkOrCreateUserFromInstagram, revokeToken } from "../services/instagram.service";
import { OAuthState } from "../models/OAuthState";

const router = express.Router();

const ALLOWED_ROLES = ["user", "staff", "founder", "developer"];

// Token expiry: 1 day for access tokens (use refresh tokens for longer sessions)
const TOKEN_EXPIRY = "1d";

// Password strength requirements
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

// ─── Email-Based Role Determination ─────────────────────────────────
// Role is determined by email domain at registration time.
// @theSMIC.com prefix determines internal role; all others default to "user".
const INTERNAL_DOMAINS = ["thesmic.com", "thesim.com"]; // lowercase — email is .toLowerCase()'d before comparison

function determineRoleFromEmail(email: string): string {
  const lower = email.toLowerCase().trim();
  const [localPart, domain] = lower.split("@");

  if (!INTERNAL_DOMAINS.includes(domain)) return "user";

  // Match the local part prefix to internal roles
  if (localPart === "founder" || localPart.startsWith("founder.") || localPart.startsWith("founder+")) return "founder";
  if (localPart === "developer" || localPart.startsWith("developer.") || localPart.startsWith("developer+") || localPart.startsWith("dev.") || localPart.startsWith("dev+")) return "developer";
  if (localPart === "staff" || localPart.startsWith("staff.") || localPart.startsWith("staff+")) return "staff";

  // Any other @theSMIC.com email defaults to staff
  return "staff";
}

function validatePassword(password: string): string | null {
  if (!password || password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
  }
  if (!PASSWORD_REGEX.test(password)) {
    return "Password must contain at least one uppercase letter, one lowercase letter, and one digit";
  }
  return null;
}

function getJwtSecret(): string {
  return process.env.JWT_SECRET as string;
}

function safeRedirectList() {
  const raw = process.env.ALLOWED_REDIRECT_URIS || "";
  return raw.split(",").map(s => s.trim()).filter(Boolean);
}

function buildTokenPayload(user: any) {
  return {
    sub: String(user._id),
    email: user.email,
    role: user.role,
    orgId: user.organizationId ? String(user.organizationId) : undefined,
    suspended: user.suspended || false,
  };
}

function isInternalEmail(email: string): boolean {
  const domain = email.toLowerCase().trim().split("@")[1];
  return INTERNAL_DOMAINS.includes(domain);
}

// register: by default creates a `user`. If the request is authenticated
// and the caller has user:role:manage permission, they may create other roles.
// Internal @theSMIC.com emails do NOT require a password.
router.post("/register", async (req, res) => {
  const { email, password, role } = req.body;
  if (!email) return res.status(400).json({ error: "Missing email" });

  // Basic email validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  const internal = isInternalEmail(email);

  // External users require a password; internal users do not
  if (!internal) {
    if (!password) return res.status(400).json({ error: "Missing password" });
    const pwError = validatePassword(password);
    if (pwError) return res.status(400).json({ error: pwError });
  }

  const existing = await User.findOne({ email });
  if (existing) return res.status(400).json({ error: "Exists" });

  // For internal users, generate a random password hash (they'll never use it)
  const hash = await bcrypt.hash(
    internal ? crypto.randomBytes(32).toString("hex") : password,
    12
  );

  // Email-based role determination (primary method)
  let assignedRole: string = determineRoleFromEmail(email);

  // Override: if authenticated caller has user:role:manage permission and requests a specific role
  if (role && ALLOWED_ROLES.includes(role)) {
    const auth = req.headers.authorization;
    if (auth) {
      try {
        const token = auth.replace(/^Bearer\s+/, "");
        const payload = jwt.verify(token, getJwtSecret()) as any;
        if (roleHasPermission(payload.role, "user:role:manage")) {
          assertCanAssignRole(payload.role, role);
          assignedRole = role;
        }
      } catch (e) {
        // ignore and keep email-based role
      }
    }
  }

  const user = await User.create({ email, passwordHash: hash, role: assignedRole });

  // Audit role assignment
  try {
    await AuditLog.create({
      actor: user._id,
      action: "auth:register",
      target: user._id,
      details: { email, assignedRole, method: internal ? "internal_email" : "email_domain" },
    });
  } catch (e) { /* audit log failure should not block registration */ }

  // For internal users, immediately return a token (no password needed)
  if (internal) {
    const token = jwt.sign(buildTokenPayload(user), getJwtSecret(), { expiresIn: TOKEN_EXPIRY });
    return res.json({ id: user._id, email: user.email, role: user.role, token });
  }

  return res.json({ id: user._id, email: user.email, role: user.role });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email) return res.status(400).json({ error: "Missing email" });

  const internal = isInternalEmail(email);

  // External users require password; internal users do not
  if (!internal && !password) {
    return res.status(400).json({ error: "Missing password" });
  }

  let user = await User.findOne({ email });

  // Auto-register internal users on first login
  if (!user && internal) {
    const hash = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 12);
    const assignedRole = determineRoleFromEmail(email);
    user = await User.create({ email, passwordHash: hash, role: assignedRole });
    try {
      await AuditLog.create({
        actor: user._id,
        action: "auth:register:auto",
        target: user._id,
        details: { email, assignedRole, method: "internal_auto" },
      });
    } catch (e) { /* ignore */ }
  }

  if (!user) return res.status(400).json({ error: "Invalid" });

  // For external users, verify password
  if (!internal) {
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(400).json({ error: "Invalid" });
  }

  // Block suspended accounts
  if (user.suspended) {
    return res.status(403).json({ error: "Account suspended" });
  }

  // Re-validate role from email domain on every login (enforce immutability)
  const emailRole = determineRoleFromEmail(email);
  if (user.role !== emailRole) {
    user.role = emailRole as any;
  }

  // Update last login
  user.lastLoginAt = new Date();
  await user.save();

  const token = jwt.sign(buildTokenPayload(user), getJwtSecret(), { expiresIn: TOKEN_EXPIRY });
  return res.json({ token, role: user.role });
});

// ─── Token Refresh ──────────────────────────────────────────────────
// Accepts a valid (or recently-expired) server_token and issues a fresh one.
// This keeps users signed in without requiring re-authentication.
router.post("/refresh", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Missing token" });

  const token = authHeader.replace(/^Bearer\s+/, "");
  try {
    // Allow tokens expired within the last 7 days to be refreshed
    const payload = jwt.verify(token, getJwtSecret(), { ignoreExpiration: true }) as any;
    const expiredAt = (payload.exp || 0) * 1000;
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    if (expiredAt < Date.now() - sevenDaysMs) {
      return res.status(401).json({ error: "Token too old to refresh" });
    }

    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ error: "User not found" });
    if (user.suspended) return res.status(403).json({ error: "Account suspended" });

    // Re-validate role from email
    const emailRole = determineRoleFromEmail(user.email);
    if (user.role !== emailRole) {
      user.role = emailRole as any;
      await user.save();
    }

    const newToken = jwt.sign(buildTokenPayload(user), getJwtSecret(), { expiresIn: TOKEN_EXPIRY });
    return res.json({ token: newToken, role: user.role });
  } catch (e: any) {
    return res.status(401).json({ error: "Invalid token" });
  }
});

// ─── Health Check (backend connectivity) ────────────────────────────
router.get("/ping", (_req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

// staff can issue a one-time code for a user to sign in (OTP)
router.post("/otp/send", ensureAuth, ensurePermission("user:read:any"), async (req: AuthRequest, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "userId required" });
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  // Use crypto.randomInt for secure OTP generation
  const code = crypto.randomInt(100000, 999999).toString();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 15); // 15 minutes
  const otp = await Otp.create({ userId: user._id, code, createdBy: req.userId, expiresAt });

  // TODO: integrate SMS/email provider. For now return the code so it can be used in testing.
  res.json({ ok: true, otpId: otp._id, code });
});

// verify OTP and issue JWT for the target user
router.post("/otp/verify", async (req, res) => {
  const { userId, code } = req.body;
  if (!userId || !code) return res.status(400).json({ error: "Missing" });
  const otp = await Otp.findOne({ userId, code, used: false });
  if (!otp) return res.status(400).json({ error: "Invalid code" });
  if (otp.expiresAt < new Date()) return res.status(400).json({ error: "Expired" });

  otp.used = true;
  await otp.save();

  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  if (user.suspended) {
    return res.status(403).json({ error: "Account suspended" });
  }

  const token = jwt.sign(buildTokenPayload(user), getJwtSecret(), { expiresIn: TOKEN_EXPIRY });
  res.json({ token });
});

// Return an auth URL for Instagram Login. Use server-generated state.
router.get("/instagram/url", async (req, res) => {
  const { redirectUri, action } = req.query as any;
  const act = action === "link" ? "link" : "login";

  // Validate redirectUri against allowed list to avoid open redirect
  if (redirectUri) {
    const allowed = safeRedirectList();
    if (!allowed.includes(redirectUri)) return res.status(400).json({ error: "Invalid redirectUri" });
  }

  const stateDoc = await createState(act, redirectUri);
  const url = buildAuthUrl(stateDoc.state, redirectUri, ["email"]);
  res.json({ url, state: stateDoc.state });
});

// OAuth callback endpoint configured in Meta app settings
router.get("/instagram/callback", async (req, res) => {
  const { code, state } = req.query as any;
  if (!code || !state) return res.status(400).send("Missing code or state");
  let stateDoc;
  try {
    stateDoc = await consumeState(state);
  } catch (e: any) {
    return res.status(400).send(`Invalid state: ${e.message}`);
  }

  try {
    const tokenResp: any = await exchangeCodeForToken(code, stateDoc.redirectUri || undefined);
    const accessToken = tokenResp.access_token;
    const expiresIn = tokenResp.expires_in;
    if (!accessToken) return res.status(500).send("Failed to obtain access token");

    const profile = await fetchProfile(accessToken);

    if (stateDoc.action === "link" && stateDoc.userId) {
      // link to existing account
      const linked = await linkOrCreateUserFromInstagram(profile, accessToken, expiresIn, String(stateDoc.userId));
      await AuditLog.create({ action: "auth:instagram:link_callback", actor: linked._id, target: linked._id, details: { profile } });
      // Redirect back to client if redirectUri was provided
      if (stateDoc.redirectUri) return res.redirect(stateDoc.redirectUri);
      return res.json({ ok: true });
    }

    // login or signup flow
    const user = await linkOrCreateUserFromInstagram(profile, accessToken, expiresIn);

    // Issue JWT
    if (user.suspended) return res.status(403).send("Account suspended");
    user.lastLoginAt = new Date();
    await user.save();
    const token = jwt.sign({ sub: String(user._id), role: user.role }, getJwtSecret(), { expiresIn: "1d" });

    await AuditLog.create({ action: "auth:instagram:login_callback", actor: user._id, target: user._id, details: { profile } });

    if (stateDoc.redirectUri) {
      // Append token to redirect URI fragment (not query) to avoid logging in server logs
      const url = new URL(stateDoc.redirectUri);
      url.hash = `token=${token}`;
      return res.redirect(url.toString());
    }

    return res.json({ token });
  } catch (e: any) {
    console.error("Instagram callback error:", e);
    return res.status(500).send("Instagram OAuth error");
  }
});

// Authenticated unlink
router.post("/instagram/unlink", ensureAuth, async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.userId).select("instagram");
    if (!user) return res.status(404).json({ error: "User not found" });
    const token = user.instagram?.accessToken;
    if (token) {
      try { await revokeToken(token); } catch (e) { /* ignore */ }
    }
    user.instagram = undefined as any;
    await user.save();
    await AuditLog.create({ action: "auth:instagram:unlink", actor: req.userId, target: user._id });
    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || String(e) });
  }
});

// Refresh token for current user (exchange short-lived -> long-lived)
router.post("/instagram/refresh", ensureAuth, async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.userId).select("instagram");
    if (!user || !user.instagram?.accessToken) return res.status(400).json({ error: "No instagram token" });
    const { exchangeToLongLived } = await import("../services/instagram.service");
    try {
      const resp: any = await exchangeToLongLived(user.instagram.accessToken as string);
      user.instagram = user.instagram || {} as any;
      user.instagram.accessToken = resp.access_token || user.instagram.accessToken;
      user.instagram.tokenExpiresAt = resp.expires_in ? new Date(Date.now() + resp.expires_in * 1000) : user.instagram.tokenExpiresAt;
      await user.save();
      await AuditLog.create({ action: "auth:instagram:refresh", actor: req.userId, target: user._id });
      return res.json({ ok: true });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || String(e) });
    }
  } catch (e: any) {
    return res.status(500).json({ error: e.message || String(e) });
  }
});

// founders can change roles for existing users (with privilege escalation prevention)
router.put(
  "/role/:id",
  ensureAuth,
  ensurePermission("user:role:manage"),
  auditSensitive("user:role:update"),
  async (req: AuthRequest, res) => {
    const { id } = req.params;
    const { role } = req.body;
    if (!ALLOWED_ROLES.includes(role)) return res.status(400).json({ error: "Invalid role" });

    // Prevent self-role-change
    if (id === req.userId) {
      return res.status(403).json({ error: "Cannot change your own role" });
    }

    // Privilege escalation prevention
    try {
      assertCanAssignRole(req.role!, role);
    } catch (e: any) {
      return res.status(403).json({ error: e.message });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: "Not found" });
    const previous = user.role;
    user.role = role as any;
    await user.save();

    // Audit log is handled by auditSensitive middleware, but keep explicit log for details
    try {
      await AuditLog.create({ actor: req.userId, action: "user:role:update", target: user._id, details: { from: previous, to: role } });
    } catch (e) {
      console.error("AuditLog error:", e);
    }

    res.json({ id: user._id, email: user.email, role: user.role });
  }
);

export default router;
