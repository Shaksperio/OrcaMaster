import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ReadOnlyVersionSnapshot } from "../client/src/components/ReadOnlyVersionSnapshot";

describe("Histórico de versões read-only", () => {
  it("renderiza o snapshot real dentro de details/pre sem controles de edição", () => {
    const html = renderToStaticMarkup(<ReadOnlyVersionSnapshot data={{ number: "ORC-010", total: "100.00" }} />);
    expect(html).toContain("<details");
    expect(html).toContain("Ver snapshot");
    expect(html).toContain("ORC-010");
    expect(html).toContain("100.00");
    expect(html).not.toContain("input");
    expect(html).not.toContain("textarea");
  });

  it("informa quando o snapshot não possui conteúdo", () => {
    const html = renderToStaticMarkup(<ReadOnlyVersionSnapshot data={null} />);
    expect(html).toContain("Snapshot sem conteúdo disponível.");
  });
});
