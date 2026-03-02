import { describe, it, expect } from "vitest";
import {
  roleHasPermission,
  getPermissionsForRole,
  ROLE_HIERARCHY,
  roleLevel,
} from "../lib/permissions";

describe("Frontend Permissions (parity with server)", () => {
  // ─── Role Hierarchy ───────────────────────────────────────────────
  describe("Role Hierarchy", () => {
    it("should match server hierarchy", () => {
      expect(ROLE_HIERARCHY.user).toBe(0);
      expect(ROLE_HIERARCHY.staff).toBe(1);
      expect(ROLE_HIERARCHY.developer).toBe(2);
      expect(ROLE_HIERARCHY.founder).toBe(3);
    });

    it("roleLevel returns correct values", () => {
      expect(roleLevel("user")).toBe(0);
      expect(roleLevel("founder")).toBe(3);
      expect(roleLevel("unknown")).toBe(-1);
    });
  });

  // ─── User Permissions ─────────────────────────────────────────────
  describe("User permissions", () => {
    it("should have self-scoped and app:use", () => {
      expect(roleHasPermission("user", "user:read:self")).toBe(true);
      expect(roleHasPermission("user", "user:update:self")).toBe(true);
      expect(roleHasPermission("user", "app:use")).toBe(true);
      expect(roleHasPermission("user", "keys:manage:self")).toBe(true);
      expect(roleHasPermission("user", "ticket:create:self")).toBe(true);
      expect(roleHasPermission("user", "ticket:read:self")).toBe(true);
    });

    it("should NOT have elevated permissions", () => {
      expect(roleHasPermission("user", "user:read:any")).toBe(false);
      expect(roleHasPermission("user", "user:suspend")).toBe(false);
      expect(roleHasPermission("user", "logs:read")).toBe(false);
      expect(roleHasPermission("user", "content:moderate")).toBe(false);
    });
  });

  // ─── Staff Permissions ────────────────────────────────────────────
  describe("Staff permissions", () => {
    it("should have user management and ticket permissions", () => {
      expect(roleHasPermission("staff", "user:read:any")).toBe(true);
      expect(roleHasPermission("staff", "user:suspend")).toBe(true);
      expect(roleHasPermission("staff", "ticket:read:any")).toBe(true);
      expect(roleHasPermission("staff", "ticket:update:any")).toBe(true);
      expect(roleHasPermission("staff", "ticket:resolve:any")).toBe(true);
      expect(roleHasPermission("staff", "content:moderate")).toBe(true);
    });

    it("should inherit user permissions (app:use, etc.)", () => {
      expect(roleHasPermission("staff", "app:use")).toBe(true);
      expect(roleHasPermission("staff", "keys:manage:self")).toBe(true);
    });

    it("should NOT have dev/infra permissions", () => {
      expect(roleHasPermission("staff", "logs:read")).toBe(false);
      expect(roleHasPermission("staff", "feature_flags:manage")).toBe(false);
      expect(roleHasPermission("staff", "impersonate:staging")).toBe(false);
    });
  });

  // ─── Developer Permissions ────────────────────────────────────────
  describe("Developer permissions", () => {
    it("should have observability and technical permissions", () => {
      expect(roleHasPermission("developer", "logs:read")).toBe(true);
      expect(roleHasPermission("developer", "debug:read")).toBe(true);
      expect(roleHasPermission("developer", "feature_flags:manage")).toBe(true);
      expect(roleHasPermission("developer", "impersonate:staging")).toBe(true);
    });

    it("should NOT have billing or ownership permissions", () => {
      expect(roleHasPermission("developer", "billing:manage")).toBe(false);
      expect(roleHasPermission("developer", "org:delete")).toBe(false);
      expect(roleHasPermission("developer", "user:role:manage")).toBe(false);
    });
  });

  // ─── Founder Wildcard ─────────────────────────────────────────────
  describe("Founder wildcard", () => {
    it("should cover any permission", () => {
      expect(roleHasPermission("founder", "user:read:any")).toBe(true);
      expect(roleHasPermission("founder", "billing:manage")).toBe(true);
      expect(roleHasPermission("founder", "org:delete")).toBe(true);
      expect(roleHasPermission("founder", "some:random:permission")).toBe(true);
    });
  });

  // ─── Scope Matching ───────────────────────────────────────────────
  describe("Scope matching", () => {
    it("any scope covers self", () => {
      expect(roleHasPermission("staff", "user:read:self")).toBe(true);
    });

    it("self scope does NOT cover any", () => {
      expect(roleHasPermission("user", "user:read:any")).toBe(false);
    });
  });

  // ─── Edge Cases ───────────────────────────────────────────────────
  describe("Edge cases", () => {
    it("null role returns false", () => {
      expect(roleHasPermission(null, "app:use")).toBe(false);
    });

    it("undefined role returns false", () => {
      expect(roleHasPermission(undefined, "app:use")).toBe(false);
    });

    it("getPermissionsForRole null returns empty", () => {
      expect(getPermissionsForRole(null)).toEqual([]);
    });
  });
});
