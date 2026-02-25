import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAttachments,
  getAttachmentsByIdeaId,
  deleteAttachmentsByIdeaId,
  getAttachmentsForIdeas,
} from "@/lib/queries/attachments";

function createMockSupabase(overrides: Record<string, unknown> = {}) {
  const chainable = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    ...overrides,
  };

  return {
    from: vi.fn().mockReturnValue(chainable),
    _chainable: chainable,
  };
}

describe("createAttachments", () => {
  beforeEach(() => vi.clearAllMocks());

  it("inserts batch and returns created rows", async () => {
    const attachments = [
      {
        idea_id: "idea-1",
        original_file_name: "doc.pdf",
        file_size: 1000,
        mime_type: "application/pdf",
        storage_path: "user-1/123-doc.pdf",
        upload_order: 1,
      },
      {
        idea_id: "idea-1",
        original_file_name: "img.png",
        file_size: 2000,
        mime_type: "image/png",
        storage_path: "user-1/124-img.png",
        upload_order: 2,
      },
    ];

    const created = attachments.map((a, i) => ({
      id: `att-${i}`,
      ...a,
      created_at: "2026-02-25T10:00:00Z",
    }));

    const chainable = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({ data: created, error: null }),
    };

    const supabase = { from: vi.fn().mockReturnValue(chainable) } as any;

    const { data, error } = await createAttachments(supabase, attachments);

    expect(error).toBeNull();
    expect(data).toHaveLength(2);
    expect(data![0].original_file_name).toBe("doc.pdf");
    expect(data![1].original_file_name).toBe("img.png");
    expect(supabase.from).toHaveBeenCalledWith("idea_attachment");
    expect(chainable.insert).toHaveBeenCalledWith(attachments);
  });

  it("returns error on insert failure", async () => {
    const chainable = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({ data: null, error: { message: "RLS violation" } }),
    };

    const supabase = { from: vi.fn().mockReturnValue(chainable) } as any;

    const { data, error } = await createAttachments(supabase, []);
    expect(error).toBe("RLS violation");
    expect(data).toBeNull();
  });
});

describe("getAttachmentsByIdeaId", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns attachments ordered by upload_order", async () => {
    const attachments = [
      { id: "a1", idea_id: "idea-1", upload_order: 1, original_file_name: "first.pdf" },
      { id: "a2", idea_id: "idea-1", upload_order: 2, original_file_name: "second.png" },
    ];

    const chainable = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: attachments, error: null }),
    };

    const supabase = { from: vi.fn().mockReturnValue(chainable) } as any;

    const { data, error } = await getAttachmentsByIdeaId(supabase, "idea-1");

    expect(error).toBeNull();
    expect(data).toHaveLength(2);
    expect(data[0].upload_order).toBe(1);
    expect(data[1].upload_order).toBe(2);
    expect(chainable.eq).toHaveBeenCalledWith("idea_id", "idea-1");
    expect(chainable.order).toHaveBeenCalledWith("upload_order", { ascending: true });
  });

  it("returns empty array when no attachments", async () => {
    const chainable = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    };

    const supabase = { from: vi.fn().mockReturnValue(chainable) } as any;

    const { data, error } = await getAttachmentsByIdeaId(supabase, "idea-999");
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });
});

describe("deleteAttachmentsByIdeaId", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes all attachments for an idea", async () => {
    const chainable = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };

    const supabase = { from: vi.fn().mockReturnValue(chainable) } as any;

    const { error } = await deleteAttachmentsByIdeaId(supabase, "idea-1");

    expect(error).toBeNull();
    expect(supabase.from).toHaveBeenCalledWith("idea_attachment");
    expect(chainable.eq).toHaveBeenCalledWith("idea_id", "idea-1");
  });

  it("returns error on delete failure", async () => {
    const chainable = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: { message: "Not admin" } }),
    };

    const supabase = { from: vi.fn().mockReturnValue(chainable) } as any;

    const { error } = await deleteAttachmentsByIdeaId(supabase, "idea-1");
    expect(error).toBe("Not admin");
  });
});

describe("getAttachmentsForIdeas", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns attachments grouped by idea", async () => {
    const attachments = [
      { id: "a1", idea_id: "idea-1", upload_order: 1, original_file_name: "f1.pdf" },
      { id: "a2", idea_id: "idea-1", upload_order: 2, original_file_name: "f2.pdf" },
      { id: "a3", idea_id: "idea-2", upload_order: 1, original_file_name: "f3.png" },
    ];

    const chainable = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: attachments, error: null }),
    };

    const supabase = { from: vi.fn().mockReturnValue(chainable) } as any;

    const { data, error } = await getAttachmentsForIdeas(supabase, ["idea-1", "idea-2"]);

    expect(error).toBeNull();
    expect(data["idea-1"]).toHaveLength(2);
    expect(data["idea-2"]).toHaveLength(1);
    expect(chainable.in).toHaveBeenCalledWith("idea_id", ["idea-1", "idea-2"]);
  });

  it("returns empty record for empty idea list", async () => {
    const chainable = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    };

    const supabase = { from: vi.fn().mockReturnValue(chainable) } as any;

    const { data, error } = await getAttachmentsForIdeas(supabase, []);
    expect(error).toBeNull();
    expect(data).toEqual({});
  });
});
