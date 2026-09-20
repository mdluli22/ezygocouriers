import Link from "next/link";

export default function MobileVerificationPage() {
  return <main className="mx-auto max-w-lg px-6 py-20">
    <h1 className="text-3xl font-bold">Verify your email</h1>
    <p className="my-6">Open the EzyGo app and enter the six-digit code from your email. Your code expires after 10 minutes.</p>
    <a className="inline-block rounded-lg bg-emerald-800 px-6 py-3 text-white" href="ezygo://auth/verify">Open EzyGo app</a>
    <p className="mt-6">Using the website? <Link className="underline" href="/auth/login">Continue to sign in</Link> and follow the email verification prompt.</p>
  </main>;
}
