import type { Metadata } from "next";
import LegalPage from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Cookie Policy | EzyGo Couriers",
  description: "How EzyGo uses cookies and browser storage for sign-in, app features, and delivery updates, and how to manage them.",
};

const storageTypes = [
  { name: "Sign-in cookies", purpose: "Keep you signed in and connect your browser to your EzyGo account. Signing out ends your session.", duration: "Sessions last up to 7 days and may renew while you use the app." },
  { name: "Sign-in security", purpose: "Support account verification and secure sign-in, including Google sign-in when you choose it.", duration: "Temporary data used during sign-in." },
  { name: "App installation preference", purpose: "Remember when you dismiss the prompt to install EzyGo on your device.", duration: "Until you clear the stored site data." },
  { name: "Offline app files", purpose: "Store images and an offline page so the app can show basic content without a connection. This cache does not store account pages, API responses, or payment callbacks.", duration: "Until the app refreshes its cache or you clear site data." },
  { name: "Driver location retry", purpose: "When a driver enables location sharing, the app may store the latest location on the device if a network request fails, then retry when a connection is available.", duration: "Cleared after a successful sync. Locations older than 15 minutes are discarded when the app retries." },
];

const sections = [
  {
    id: "what-are-cookies",
    title: "Cookies and browser storage",
    content: <p>Cookies are small files stored by your browser. EzyGo also uses local storage and an app cache to support features such as sign-in, installation prompts, and offline access. This policy covers these forms of browser storage.</p>,
  },
  {
    id: "how-we-use",
    title: "What we use storage for",
    content: <>
      <p>We use browser storage to keep you signed in, support secure account access, and keep app features working. The entries below explain what is stored and why.</p>
      <p className="mt-3">The EzyGo web app does not currently include its own advertising or analytics cookie tools. Your light or dark theme follows your device setting automatically.</p>
    </>,
  },
  {
    id: "types-of-cookies",
    title: "What is stored on your device",
    content: <div className="legal-storage-list">{storageTypes.map(item => <div key={item.name} className="legal-storage-item">
      <h3>{item.name}</h3><p>{item.purpose}</p>
      <p className="legal-storage-duration"><strong>Duration: </strong>{item.duration}</p>
    </div>)}</div>,
  },
  {
    id: "third-party",
    title: "Services provided by other companies",
    content: <>
      <p>EzyGo uses Yoco for checkout and Google for address search, maps, and optional Google sign-in. These services may use their own cookies or browser storage when you use them.</p>
      <p className="mt-3">Their handling of that information is explained in their own privacy and cookie policies. EzyGo does not operate an advertising network.</p>
    </>,
  },
  {
    id: "managing-cookies",
    title: "Managing stored data",
    content: <>
      <p>Use your browser&apos;s privacy or site-data settings to view, block, or delete cookies and stored data for EzyGo. The setting names vary by browser and device.</p>
      <ul className="legal-bullet-list">
        <li>Blocking sign-in cookies may prevent you from accessing your account.</li>
        <li>Clearing site data can sign you out, reset installation prompts, and remove offline files or a queued driver location.</li>
        <li>Location and notification permissions are separate settings. Manage them in your browser or device settings.</li>
        <li>Change your device theme to switch EzyGo between light and dark mode.</li>
      </ul>
    </>,
  },
  {
    id: "consent",
    title: "Your choices",
    content: <>
      <p>You choose whether to install the app, enable notifications, use Google sign-in, or share your location as a driver. Your browser asks for the relevant permissions where required.</p>
      <p className="mt-3">You can manage cookies and site data through your browser. Contact <a className="text-[var(--legal-accent)] underline" href="mailto:support@ezygocouriers.co.za">support@ezygocouriers.co.za</a> if you have questions about how EzyGo uses stored information.</p>
    </>,
  },
  {
    id: "changes",
    title: "Changes to this policy",
    content: <p>We may update this policy when our services or storage practices change. The latest version and its update date will appear on this page.</p>,
  },
];

export default function CookiesPage() {
  return <LegalPage title="Cookie Policy" path="/legal/cookies" sections={sections} contactTitle="Questions about cookies?" />;
}
