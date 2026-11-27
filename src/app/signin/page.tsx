import type { Metadata } from "next";
import { Suspense } from "react";
import { SignInPage } from "@/components/sign-in-page";

export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: false } };

export default function Page() {
  // useSearchParams needs a Suspense boundary during static rendering
  return (
    <Suspense>
      <SignInPage />
    </Suspense>
  );
}