import axios from "axios";
import qs from "querystring";
import { OAuthState } from "../models/OAuthState";
import { User } from "../models/User";
import { AuditLog } from "../models/AuditLog";

const FB_OAUTH_URL = "https://www.facebook.com/v16.0/dialog/oauth";
const FB_TOKEN_URL = "https://graph.facebook.com/v16.0/oauth/access_token";
const FB_ME_URL = "https://graph.facebook.com/me";

function getClientId() {
  return process.env.INSTAGRAM_CLIENT_ID as string;
}

function getClientSecret() {
  return process.env.INSTAGRAM_CLIENT_SECRET as string;
}

function getRedirectUri() {
  return process.env.INSTAGRAM_REDIRECT_URI as string;
}

export function buildAuthUrl(state: string, redirectUri?: string, scopes: string[] = ["email"]) {
  const params: any = {
    client_id: getClientId(),
    redirect_uri: redirectUri || getRedirectUri(),
    state,
    response_type: "code",
    scope: scopes.join(","),
  };
  return `${FB_OAUTH_URL}?${qs.stringify(params)}`;
}

export async function createState(action: "login" | "link" = "login", redirectUri?: string, userId?: string) {
  const state = Math.random().toString(36).slice(2) + Date.now().toString(36);
  const doc = await OAuthState.create({ state, action, redirectUri, userId });
  return doc;
}

export async function consumeState(state: string) {
  const doc = await OAuthState.findOne({ state });
  if (!doc) throw new Error("Invalid or expired state");
  // optional: enforce TTL of e.g., 10 minutes
  const age = Date.now() - doc.createdAt.getTime();
  if (age > 1000 * 60 * 15) {
    await OAuthState.deleteOne({ _id: doc._id });
    throw new Error("State expired");
  }
  await OAuthState.deleteOne({ _id: doc._id });
  return doc;
}

export async function exchangeCodeForToken(code: string, redirectUri?: string) {
  // Exchange code for access token
  const params: any = {
    client_id: getClientId(),
    client_secret: getClientSecret(),
    redirect_uri: redirectUri || getRedirectUri(),
    code,
  };
  const resp = await axios.get(FB_TOKEN_URL, { params });
  return resp.data; // { access_token, token_type, expires_in }
}

export async function exchangeToLongLived(shortLivedToken: string) {
  // Exchange short-lived token for long-lived token
  const params: any = {
    grant_type: "fb_exchange_token",
    client_id: getClientId(),
    client_secret: getClientSecret(),
    fb_exchange_token: shortLivedToken,
  };
  const resp = await axios.get(FB_TOKEN_URL, { params });
  return resp.data; // { access_token, token_type, expires_in }
}

export async function fetchProfile(accessToken: string) {
  // Request basic fields, including picture. Instagram-specific fields require additional setup.
  const params = { fields: "id,name,picture,short_name", access_token: accessToken } as any;
  const resp = await axios.get(FB_ME_URL, { params });
  return resp.data; // may include id and picture
}

export async function linkOrCreateUserFromInstagram(profile: any, accessToken: string, expiresIn?: number, userIdToLink?: string) {
  // profile: {id, name, picture}
  const instagramId = String(profile.id);

  // Prevent duplicates: find existing user with this instagram id
  const existing = await User.findOne({ "instagram.id": instagramId });
  if (userIdToLink) {
    // linking flow: user must be authenticated and wants to attach IG account
    const target = await User.findById(userIdToLink);
    if (!target) throw new Error("Target user not found");
    if (existing && existing._id.toString() !== target._id.toString()) {
      throw new Error("This Instagram account is already linked to another user");
    }
    const ig = target.instagram || {} as NonNullable<typeof target.instagram>;
    ig.id = instagramId;
    ig.username = profile.name || profile.short_name || "";
    ig.profilePicture = profile.picture?.data?.url || profile.picture || "";
    ig.accessToken = accessToken;
    ig.tokenExpiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : null;
    ig.linkedAt = new Date();
    target.instagram = ig;
    await target.save();
    await AuditLog.create({ action: "auth:instagram:link", actor: target._id, target: target._id, details: { instagramId } });
    return target;
  } else {
    if (existing) {
      // Update tokens and return existing user
      const eig = existing.instagram || {} as NonNullable<typeof existing.instagram>;
      eig.accessToken = accessToken;
      eig.tokenExpiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : null;
      eig.profilePicture = profile.picture?.data?.url || eig.profilePicture;
      eig.username = profile.name || eig.username;
      eig.linkedAt = new Date();
      existing.instagram = eig;
      await existing.save();
      await AuditLog.create({ action: "auth:instagram:login", actor: existing._id, target: existing._id, details: { instagramId } });
      return existing;
    }

    // Create new user with default role 'user' and minimal data
    const newUser = await User.create({
      email: `insta_${instagramId}@instagram.local`,
      passwordHash: Math.random().toString(36), // unusable password; user authenticates via IG
      role: "user",
      instagram: {
        id: instagramId,
        username: profile.name || profile.short_name || "",
        profilePicture: profile.picture?.data?.url || profile.picture || "",
        accessToken,
        tokenExpiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000) : null,
        linkedAt: new Date(),
      },
    } as any);
    await AuditLog.create({ action: "auth:instagram:signup", actor: newUser._id, target: newUser._id, details: { instagramId } });
    return newUser;
  }
}

export async function revokeToken(accessToken: string) {
  // Best-effort revocation. Meta provides token debugging/revoke endpoints.
  try {
    // Example: https://graph.facebook.com/me/permissions?access_token={access-token}
    await axios.delete(`${FB_ME_URL}/permissions`, { params: { access_token: accessToken } });
  } catch (e) {
    // ignore errors
  }
}
