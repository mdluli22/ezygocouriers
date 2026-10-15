"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, RotateCw } from "lucide-react";

export default function ListControls({ error, loading, reload, page, next, previous }: {
  error: string; loading: boolean; reload: () => void; page?: number; next?: () => void; previous?: () => void;
}) {
  if (!error && !next && !previous) return null;
  return (
    <div className="list-controls" aria-label="List navigation">
      {error ? <div className="list-error" role="alert"><p>{error} {error.includes("sign in") && <Link href="/auth/login">Sign in</Link>}</p><button type="button" onClick={reload} disabled={loading}><RotateCw size={16} /> Retry</button></div> : (
        <>
          <span className="list-page">Results · {page}</span>
          <div className="list-navigation">
            <button type="button" onClick={previous} disabled={!previous || loading} aria-label="Previous results"><ArrowLeft size={16} /></button>
            <button type="button" onClick={next} disabled={!next || loading}>More results <ArrowRight size={16} /></button>
          </div>
        </>
      )}
    </div>
  );
}
