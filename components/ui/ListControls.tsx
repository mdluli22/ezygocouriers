"use client";
import Link from "next/link";
export default function ListControls({ error, loading, reload, page, next, previous }: {
  error: string; loading: boolean; reload: () => void; page?: number; next?: () => void; previous?: () => void;
}) {
  return <div className="flex flex-wrap items-center gap-3 py-3 text-sm" aria-label="List navigation">
    {error && <p role="alert">{error} {error.includes("sign in") && <Link href="/auth/login" className="underline">Sign in</Link>}</p>}
    <button type="button" className="btn-secondary" onClick={reload} disabled={loading}>{error ? "Retry" : "Refresh"}</button>
    {page && <><button type="button" className="btn-secondary" onClick={previous} disabled={!previous || loading}>Previous</button><span>Page {page}</span><button type="button" className="btn-secondary" onClick={next} disabled={!next || loading}>Next</button></>}
  </div>;
}
