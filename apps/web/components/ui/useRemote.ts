"use client";
import { useCallback, useEffect, useState } from "react";
import { requestJson } from "@/lib/api/client";
export function useRemote<T>(url: string) {
  const [revision, setRevision] = useState(0);
  const key = `${url}#${revision}`;
  const [state, setState] = useState<{ key: string; data?: T; error: string }>({ key: "", error: "" });
  useEffect(() => {
    const controller = new AbortController();
    requestJson<T>(url, { signal: controller.signal }).then(data => {
      if (!controller.signal.aborted) setState({ key, data, error: "" });
    }).catch(error => {
      if (!controller.signal.aborted) setState({ key, error: error.message });
    });
    return () => controller.abort();
  }, [url, key]);
  const reload = useCallback(() => setRevision(value => value + 1), []);
  return { data: state.key === key ? state.data : undefined, error: state.key === key ? state.error : "", loading: state.key !== key, reload };
}
export function usePagedList<T>(baseUrl: string) {
  const [page, setPage] = useState<{ url: string; cursors: (number | null)[] }>({ url: baseUrl, cursors: [null] });
  const cursors = page.url === baseUrl ? page.cursors : [null];
  const cursor = cursors.at(-1);
  const remote = useRemote<{ data: T[]; pagination: { nextCursor: number | null } }>(`${baseUrl}${baseUrl.includes("?") ? "&" : "?"}limit=25${cursor ? `&cursor=${cursor}` : ""}`);
  return { ...remote, items: remote.data?.data ?? [], page: cursors.length,
    next: remote.data?.pagination.nextCursor != null ? () => setPage({ url: baseUrl, cursors: [...cursors, remote.data!.pagination.nextCursor] }) : undefined,
    previous: cursors.length > 1 ? () => setPage({ url: baseUrl, cursors: cursors.slice(0, -1) }) : undefined,
  };
}
