import { describe, it, expect } from "vitest";
import {
  roleHasPermission,
  getPermissionsForRole,
  ROLE_HIERARCHY,
  roleLevel,
  Role,
} from "../utils/rbac";

describe("RBAC Permission System", () => {
  // ─── Role Hierarchy ───────────────────────────────────────────────
  describe("Role Hierarchy", () => {
    it("should define 4 roles with ascending levels", () => {
      expect(ROLE_HIERARCHY.user).toBe(0);
      expect(ROLE_HIERARCHY.staff).toBe(1);
      expect(ROLE_HIERARCHY.developer).toBe(2);
      expect(ROLE_HIERARCHY.founder).toBe(3);
    });

    it("roleLevel returns -1 for unknown roles", () => {
      expect(roleLevel("admin")).toBe(-1);
      expect(roleLevel("")).toBe(-1);
    });

    it("roleLevel returns correct level for valid roles", () => {
      expect(roleLevel("user")).toBe(0);
      expect(roleLevel("founder")).toBe(3);
    });
  });

  // ─── Permission Map Completeness ──────────────────────────────────
  describe("Permission Map", () => {
    it("user should have app:use permission", () => {
      expect(roleHasPermission("user", "app:use")).toBe(true);
    });

    it("user should have self-scoped permissions", () => {
      expect(roleHasPermission("user", "user:read:self")).toBe(true);
      expect(roleHasPermission("user", "user:update:self")).toBe(true);
      expect(roleHasPermission("user", "content:crud:self")).toBe(true);
      expect(roleHasPermission("user", "keys:manage:self")).toBe(true);
      expect(roleHasPermission("user", "ticket:create:self")).toBe(true);
      expect(roleHasPermission("user", "ticket:read:self")).toBe(true);
      expect(roleHasPermission("user", "subscription:read:self")).toBe(true);
      expect(roleHasPermission("user", "subscription:subscribe:self")).toBe(true);
    });

    it("user should have read-only public data access", () => {
      expect(roleHasPermission("user", "trends:read")).toBe(true);
      expect(roleHasPermission("user", "helpline:read")).toBe(true);
    });

    it("user should NOT have any-scope permissions", () => {
      expect(roleHasPermission("user", "user:read:any")).toBe(false);
      expect(roleHasPermission("user", "user:update:any")).toBe(false);
      expect(roleHasPermission("user", "content:moderate")).toBe(false);
      expect(roleHasPermission("user", "ticket:read:any")).toBe(false);
    });

    it("user should NOT have admin permissions", () => {
      expect(roleHasPermission("user", "user:suspend")).toBe(false);
      expect(roleHasPermission("user", "user:reset_password")).toBe(false);
      expect(roleHasPermission("user", "logs:read")).toBe(false);
      expect(roleHasPermission("user", "feature_flags:manage")).toBe(false);
      expect(roleHasPermission("user", "config:update:basic")).toBe(false);
      expect(roleHasPermission("user", "config:update:env")).toBe(false);
      expect(roleHasPermission("user", "helpline:manage")).toBe(false);
    });

    it("staff should have user management permissions", () => {
      expect(roleHasPermission("staff", "user:read:any")).toBe(true);
      expect(roleHasPermission("staff", "user:update:any")).toBe(true);
      expect(roleHasPermission("staff", "user:reset_password")).toBe(true);
      expect(roleHasPermission("staff", "user:suspend")).toBe(true);
      expect(roleHasPermission("staff", "user:reactivate")).toBe(true);
    });

    it("staff should have content moderation permissions", () => {
      expect(roleHasPermission("staff", "content:moderate")).toBe(true);
      expect(roleHasPermission("staff", "content:read:any")).toBe(true);
    });

    it("staff should have support ticket permissions", () => {
      expect(roleHasPermission("staff", "ticket:read:any")).toBe(true);
      expect(roleHasPermission("staff", "ticket:update:any")).toBe(true);
      expect(roleHasPermission("staff", "ticket:resolve:any")).toBe(true);
    });

    it("staff should have basic config but NOT env config", () => {
      expect(roleHasPermission("staff", "config:update:basic")).toBe(true);
      expect(roleHasPermission("staff", "config:update:env")).toBe(false);
    });

    it("staff should NOT have developer/infrastructure permissions", () => {
      expect(roleHasPermission("staff", "logs:read")).toBe(false);
      expect(roleHasPermission("staff", "feature_flags:manage")).toBe(false);
      expect(roleHasPermission("staff", "debug:read")).toBe(false);
      expect(roleHasPermission("staff", "metrics:read")).toBe(false);
      expect(roleHasPermission("staff", "integrations:manage")).toBe(false);
      expect(roleHasPermission("staff", "impersonate:staging")).toBe(false);
    });

    it("staff should inherit app:use from user", () => {
      expect(roleHasPermission("staff", "app:use")).toBe(true);
    });

    it("developer should have observability permissions", () => {
      expect(roleHasPermission("developer", "logs:read")).toBe(true);
      expect(roleHasPermission("developer", "debug:read")).toBe(true);
      expect(roleHasPermission("developer", "metrics:read")).toBe(true);
    });

    it("developer should have feature flag and integration permissions", () => {
      expect(roleHasPermission("developer", "feature_flags:manage")).toBe(true);
      expect(roleHasPermission("developer", "integrations:manage")).toBe(true);
      expect(roleHasPermission("developer", "api:manage")).toBe(true);
    });

    it("developer should have impersonation in staging/testing", () => {
      expect(roleHasPermission("developer", "impersonate:staging")).toBe(true);
      expect(roleHasPermission("developer", "impersonate:testing")).toBe(true);
    });

    it("developer should have trends data pipeline access", () => {
      expect(roleHasPermission("developer", "trends:signal:write")).toBe(true);
      expect(roleHasPermission("developer", "trends:read")).toBe(true);
      expect(roleHasPermission("developer", "trends:recompute")).toBe(true);
    });

    it("developer should NOT have billing/ownership permissions", () => {
      expect(roleHasPermission("developer", "billing:manage")).toBe(false);
      expect(roleHasPermission("developer", "org:delete")).toBe(false);
      expect(roleHasPermission("developer", "org:transfer")).toBe(false);
      expect(roleHasPermission("developer", "user:role:manage")).toBe(false);
    });

    it("developer should inherit staff permissions via additive hierarchy", () => {
      expect(roleHasPermission("developer", "user:suspend")).toBe(true);
      expect(roleHasPermission("developer", "user:reset_password")).toBe(true);
      expect(roleHasPermission("developer", "content:moderate")).toBe(true);
      expect(roleHasPermission("developer", "ticket:update:any")).toBe(true);
    });
  });

  // ─── Founder Wildcard ─────────────────────────────────────────────
  describe("Founder Wildcard", () => {
    it("founder should have wildcard that covers everything", () => {
      expect(roleHasPermission("founder", "user:read:self")).toBe(true);
      expect(roleHasPermission("founder", "user:read:any")).toBe(true);
      expect(roleHasPermission("founder", "user:suspend")).toBe(true);
      expect(roleHasPermission("founder", "user:role:manage")).toBe(true);
      expect(roleHasPermission("founder", "content:moderate")).toBe(true);
      expect(roleHasPermission("founder", "logs:read")).toBe(true);
      expect(roleHasPermission("founder", "feature_flags:manage")).toBe(true);
      expect(roleHasPermission("founder", "billing:manage")).toBe(true);
      expect(roleHasPermission("founder", "org:delete")).toBe(true);
      expect(roleHasPermission("founder", "org:transfer")).toBe(true);
      expect(roleHasPermission("founder", "subscription:plan:manage")).toBe(true);
      expect(roleHasPermission("founder", "app:use")).toBe(true);
      expect(roleHasPermission("founder", "any:arbitrary:permission")).toBe(true);
    });
  });

  // ─── Scope Matching ───────────────────────────────────────────────
  describe("Scope Matching", () => {
    it("any scope should cover self scope", () => {
      // Staff has user:read:any which should cover user:read:self
      expect(roleHasPermission("staff", "user:read:self")).toBe(true);
      expect(roleHasPermission("staff", "user:update:self")).toBe(true);
    });

    it("self scope should NOT cover any scope", () => {
      // User has user:read:self but NOT user:read:any
      expect(roleHasPermission("user", "user:read:any")).toBe(false);
    });
  });

  // ─── Edge Cases ───────────────────────────────────────────────────
  describe("Edge Cases", () => {
    it("undefined role returns false", () => {
      expect(roleHasPermission(undefined, "user:read:self")).toBe(false);
    });

    it("empty string role returns false", () => {
      expect(roleHasPermission("", "user:read:self")).toBe(false);
    });

    it("unknown role returns false", () => {
      expect(roleHasPermission("admin", "user:read:self")).toBe(false);
      expect(roleHasPermission("superuser", "app:use")).toBe(false);
    });

    it("getPermissionsForRole returns empty array for unknown role", () => {
      expect(getPermissionsForRole("nonexistent")).toEqual([]);
    });

    it("getPermissionsForRole returns non-empty for valid roles", () => {
      expect(getPermissionsForRole("user").length).toBeGreaterThan(0);
      expect(getPermissionsForRole("staff").length).toBeGreaterThan(0);
      expect(getPermissionsForRole("developer").length).toBeGreaterThan(0);
      expect(getPermissionsForRole("founder")).toContain("*");
      expect(getPermissionsForRole("founder").length).toBeGreaterThan(1);
    });
  });
});
