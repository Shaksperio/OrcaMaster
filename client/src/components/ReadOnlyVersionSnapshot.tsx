import React from "react";

type ReadOnlyVersionSnapshotProps = {
  data: unknown;
};

export function ReadOnlyVersionSnapshot({ data }: ReadOnlyVersionSnapshotProps) {
  return (
    <details className="mt-3">
      <summary className="cursor-pointer text-sm font-medium">Ver snapshot</summary>
      <pre className="mt-2 max-h-64 overflow-auto rounded bg-muted p-3 text-xs whitespace-pre-wrap">
        {data ? JSON.stringify(data, null, 2) : "Snapshot sem conteúdo disponível."}
      </pre>
    </details>
  );
}
