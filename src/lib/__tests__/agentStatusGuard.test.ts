import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabase
const mockGetUser = vi.fn();
const mockRpc = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    rpc: mockRpc,
  })),
}));

import {
  enforceAgentStatus,
  resolveAgentContext,
  resolveAgentContextWithEnforce,
} from "@/lib/agent/statusGuard";

const MOCK_USER = { id: "user-123", email: "test@example.com" };
const MOCK_AGENT_ROW = {
  agent_id: "agent-456",
  status: "active",
  role: "agent",
  agent_name: "Test Agent",
};

beforeEach(() => {
  mockGetUser.mockReset();
  mockRpc.mockReset();
});

// ---------------------------------------------------------------------------
// resolveAgentContext
// ---------------------------------------------------------------------------
describe("resolveAgentContext", () => {
  it("returns null when getUser fails", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const ctx = await resolveAgentContext();
    expect(ctx).toBeNull();
  });

  it("returns null when RPC returns empty array", async () => {
    mockGetUser.mockResolvedValue({ data: { user: MOCK_USER } });
    mockRpc.mockResolvedValue({ data: [], error: null });

    const ctx = await resolveAgentContext();
    expect(ctx).toBeNull();
  });

  it("returns null when RPC returns an error", async () => {
    mockGetUser.mockResolvedValue({ data: { user: MOCK_USER } });
    mockRpc.mockResolvedValue({ data: null, error: { message: "rpc failed" } });

    const ctx = await resolveAgentContext();
    expect(ctx).toBeNull();
  });

  it("returns correct AgentContext when successful", async () => {
    mockGetUser.mockResolvedValue({ data: { user: MOCK_USER } });
    mockRpc.mockResolvedValue({ data: [MOCK_AGENT_ROW], error: null });

    const ctx = await resolveAgentContext();
    expect(ctx).toEqual({
      agentId: "agent-456",
      status: "active",
      role: "agent",
      agentName: "Test Agent",
      userId: "user-123",
    });
  });

  it("handles non-array data from RPC", async () => {
    mockGetUser.mockResolvedValue({ data: { user: MOCK_USER } });
    mockRpc.mockResolvedValue({ data: MOCK_AGENT_ROW, error: null });

    const ctx = await resolveAgentContext();
    expect(ctx).toEqual({
      agentId: "agent-456",
      status: "active",
      role: "agent",
      agentName: "Test Agent",
      userId: "user-123",
    });
  });
});

// ---------------------------------------------------------------------------
// enforceAgentStatus
// ---------------------------------------------------------------------------
describe("enforceAgentStatus", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const res = await enforceAgentStatus();
    expect(res).not.toBeNull();
    expect(res!.status).toBe(401);
    const body = await res!.json();
    expect(body.error).toBe("unauthorized");
  });

  it("returns 403 with 'agent not found' when RPC fails", async () => {
    mockGetUser.mockResolvedValue({ data: { user: MOCK_USER } });
    mockRpc.mockResolvedValue({ data: null, error: { message: "rpc error" } });

    const res = await enforceAgentStatus();
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
    const body = await res!.json();
    expect(body.error).toBe("agent not found");
  });

  it("returns 403 with 'agent not found' when RPC returns empty array", async () => {
    mockGetUser.mockResolvedValue({ data: { user: MOCK_USER } });
    mockRpc.mockResolvedValue({ data: [], error: null });

    const res = await enforceAgentStatus();
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
    const body = await res!.json();
    expect(body.error).toBe("agent not found");
  });

  it("returns 403 with 'account_suspended' for suspended agents", async () => {
    mockGetUser.mockResolvedValue({ data: { user: MOCK_USER } });
    mockRpc.mockResolvedValue({
      data: [{ ...MOCK_AGENT_ROW, status: "suspended" }],
      error: null,
    });

    const res = await enforceAgentStatus();
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
    const body = await res!.json();
    expect(body.error).toBe("account_suspended");
  });

  it("returns 403 with 'feature_restricted' for pending agents", async () => {
    mockGetUser.mockResolvedValue({ data: { user: MOCK_USER } });
    mockRpc.mockResolvedValue({
      data: [{ ...MOCK_AGENT_ROW, status: "active_pending_review" }],
      error: null,
    });

    const res = await enforceAgentStatus();
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
    const body = await res!.json();
    expect(body.error).toBe("feature_restricted");
  });

  it("returns null for active agents", async () => {
    mockGetUser.mockResolvedValue({ data: { user: MOCK_USER } });
    mockRpc.mockResolvedValue({
      data: [{ ...MOCK_AGENT_ROW, status: "active" }],
      error: null,
    });

    const res = await enforceAgentStatus();
    expect(res).toBeNull();
  });

  it("returns null for pending agents when allowPending is true", async () => {
    mockGetUser.mockResolvedValue({ data: { user: MOCK_USER } });
    mockRpc.mockResolvedValue({
      data: [{ ...MOCK_AGENT_ROW, status: "active_pending_review" }],
      error: null,
    });

    const res = await enforceAgentStatus({ allowPending: true });
    expect(res).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// resolveAgentContextWithEnforce
// ---------------------------------------------------------------------------
describe("resolveAgentContextWithEnforce", () => {
  it("returns deny with 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const result = await resolveAgentContextWithEnforce();
    expect(result.ctx).toBeNull();
    expect(result.deny).not.toBeNull();
    expect(result.deny!.status).toBe(401);
  });

  it("returns deny with 403 when RPC fails", async () => {
    mockGetUser.mockResolvedValue({ data: { user: MOCK_USER } });
    mockRpc.mockResolvedValue({ data: null, error: { message: "error" } });

    const result = await resolveAgentContextWithEnforce();
    expect(result.ctx).toBeNull();
    expect(result.deny).not.toBeNull();
    expect(result.deny!.status).toBe(403);
    const body = await result.deny!.json();
    expect(body.error).toBe("agent not found");
  });

  it("returns deny with 403 for suspended agents", async () => {
    mockGetUser.mockResolvedValue({ data: { user: MOCK_USER } });
    mockRpc.mockResolvedValue({
      data: [{ ...MOCK_AGENT_ROW, status: "suspended" }],
      error: null,
    });

    const result = await resolveAgentContextWithEnforce();
    expect(result.ctx).toBeNull();
    expect(result.deny).not.toBeNull();
    expect(result.deny!.status).toBe(403);
    const body = await result.deny!.json();
    expect(body.error).toBe("account_suspended");
  });

  it("returns deny with 403 for pending agents without allowPending", async () => {
    mockGetUser.mockResolvedValue({ data: { user: MOCK_USER } });
    mockRpc.mockResolvedValue({
      data: [{ ...MOCK_AGENT_ROW, status: "active_pending_review" }],
      error: null,
    });

    const result = await resolveAgentContextWithEnforce();
    expect(result.ctx).toBeNull();
    expect(result.deny).not.toBeNull();
    const body = await result.deny!.json();
    expect(body.error).toBe("feature_restricted");
  });

  it("returns ctx with deny null for active agents", async () => {
    mockGetUser.mockResolvedValue({ data: { user: MOCK_USER } });
    mockRpc.mockResolvedValue({
      data: [MOCK_AGENT_ROW],
      error: null,
    });

    const result = await resolveAgentContextWithEnforce();
    expect(result.deny).toBeNull();
    expect(result.ctx).toEqual({
      agentId: "agent-456",
      status: "active",
      role: "agent",
      agentName: "Test Agent",
      userId: "user-123",
    });
  });

  it("returns ctx for pending agents when allowPending is true", async () => {
    mockGetUser.mockResolvedValue({ data: { user: MOCK_USER } });
    mockRpc.mockResolvedValue({
      data: [{ ...MOCK_AGENT_ROW, status: "active_pending_review" }],
      error: null,
    });

    const result = await resolveAgentContextWithEnforce({ allowPending: true });
    expect(result.deny).toBeNull();
    expect(result.ctx).not.toBeNull();
    expect(result.ctx!.status).toBe("active_pending_review");
  });
});
