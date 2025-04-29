import { describe, it, vi } from "vitest";
import { nextTick } from "vue";

vi.mock("vue", async (importOriginal) => {
  const actual = await importOriginal<typeof import("vue")>();

  return {
    ...actual,
    createApp: vi.fn(() => ({
      mount: vi.fn(() => ({
        $nextTick: vi.fn(async (cb) => {
          await nextTick();
          cb();
        }),
      })),
    })),
  };
});

describe("main", () => {
  it("should work", async () => {
    await import("../main.ts");
  });
});
