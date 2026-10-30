import { describe, it, expect } from "vitest";

describe('test-simple', () => {
  it('works', () => {
    const x = 1;
    const y = 2;
    expect(x + y).toBe(3);
  });
});