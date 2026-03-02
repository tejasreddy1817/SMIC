import { describe, it, expect } from "vitest";
import {
  PermissionError,
  assertPermission,
  assertOwnership,
  assertCanAssignRole,
  assertSameOrg,
} from "../services/permission.service";

describe("Permission Service", () => {
  // ─── assertPermission ─────────────────────────────────────────────
  describe("assertPermission", () => {
    it("should not throw for valid permission", () => {
      expect(() => assertPermission("user", "app:use")).not.toThrow();
      expect(() => assertPermission("founder", "anything")).not.toThrow();
    });

    it("should throw PermissionError for invalid permission", () => {
      expect(() => assertPermission("user", "user:read:any")).toThrow(PermissionError);
      expect(() => assertPermission("staff", "logs:read")).toThrow(PermissionError);
    });

    it("should throw for undefined role", () => {
      expect(() => assertPermission(undefined, "app:use")).toThrow(PermissionError);
    });
  });

  // ─── assertOwnership ──────────────────────────────────────────────
  describe("assertOwnership", () => {
    it("should not throw when IDs match", () => {
      expect(() => assertOwnership("abc123", "abc123")).not.toThrow();
    });

    it("should throw when IDs differ", () => {
      expect(() => assertOwnership("abc123", "xyz789")).toThrow(PermissionError);
    });
  });

  // ─── assertCanAssignRole ──────────────────────────────────────────
  describe("assertCanAssignRole (Privilege Escalation Prevention)", () => {
    it("founder can assign user role", () => {
      expect(() => assertCanAssignRole("founder", "user")).not.toThrow();
    });

    it("founder can assign staff role", () => {
      expect(() => assertCanAssignRole("founder", "staff")).not.toThrow();
    });

    it("founder can assign developer role", () => {
      expect(() => assertCanAssignRole("founder", "developer")).not.toThrow();
    });

    it("founder CANNOT assign founder role (equal level)", () => {
      expect(() => assertCanAssignRole("founder", "founder")).toThrow(PermissionError);
    });

    it("developer can assign user role", () => {
      expect(() => assertCanAssignRole("developer", "user")).not.toThrow();
    });

    it("developer can assign staff role", () => {
      expect(() => assertCanAssignRole("developer", "staff")).not.toThrow();
    });

    it("developer CANNOT assign developer role (equal level)", () => {
      expect(() => assertCanAssignRole("developer", "developer")).toThrow(PermissionError);
    });

    it("developer CANNOT assign founder role (higher level)", () => {
      expect(() => assertCanAssignRole("developer", "founder")).toThrow(PermissionError);
    });

    it("staff can assign user role", () => {
      expect(() => assertCanAssignRole("staff", "user")).not.toThrow();
    });

    it("staff CANNOT assign staff role (equal level)", () => {
      expect(() => assertCanAssignRole("staff", "staff")).toThrow(PermissionError);
    });

    it("staff CANNOT assign developer role (higher level)", () => {
      expect(() => assertCanAssignRole("staff", "developer")).toThrow(PermissionError);
    });

    it("staff CANNOT assign founder role (higher level)", () => {
      expect(() => assertCanAssignRole("staff", "founder")).toThrow(PermissionError);
    });

    it("user CANNOT assign any role", () => {
      expect(() => assertCanAssignRole("user", "user")).toThrow(PermissionError);
      expect(() => assertCanAssignRole("user", "staff")).toThrow(PermissionError);
      expect(() => assertCanAssignRole("user", "developer")).toThrow(PermissionError);
      expect(() => assertCanAssignRole("user", "founder")).toThrow(PermissionError);
    });
  });

  // ─── assertSameOrg ────────────────────────────────────────────────
  describe("assertSameOrg", () => {
    it("should not throw when org IDs match", () => {
      expect(() => assertSameOrg("org1", "org1")).not.toThrow();
    });

    it("should throw when org IDs differ", () => {
      expect(() => assertSameOrg("org1", "org2")).toThrow(PermissionError);
    });

    it("should throw when actor org is undefined", () => {
      expect(() => assertSameOrg(undefined, "org1")).toThrow(PermissionError);
    });

    it("should throw when target org is undefined", () => {
      expect(() => assertSameOrg("org1", undefined)).toThrow(PermissionError);
    });

    it("should throw when both are undefined", () => {
      expect(() => assertSameOrg(undefined, undefined)).toThrow(PermissionError);
    });
  });

  // ─── PermissionError ──────────────────────────────────────────────
  describe("PermissionError", () => {
    it("should have status 403", () => {
      const err = new PermissionError();
      expect(err.status).toBe(403);
    });

    it("should have default message 'Forbidden'", () => {
      const err = new PermissionError();
      expect(err.message).toBe("Forbidden");
    });

    it("should accept custom message", () => {
      const err = new PermissionError("Custom error");
      expect(err.message).toBe("Custom error");
    });

    it("should be instance of Error", () => {
      const err = new PermissionError();
      expect(err).toBeInstanceOf(Error);
    });
  });
});
