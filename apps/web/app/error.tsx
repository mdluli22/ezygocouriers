"use client";
import Link from "next/link";
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="mx-auto max-w-lg p-8 space-y-4" role="alert"><h1 className="text-2xl font-bold">Something went wrong</h1><p>We couldn’t load this page. Please try again.</p><button className="btn-primary" onClick={reset}>Try again</button> <Link href="/dashboard" className="underline">Your deliveries</Link></main>;
}
