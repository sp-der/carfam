import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { Suspense } from "react";
import { ChatWidget } from "@/components/chat/chat-widget";
import { OpeningAnimation } from "@/components/site/opening-animation";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Suspense>
        <OpeningAnimation />
      </Suspense>
      <SiteHeader />
      <main id="main" className="flex flex-1 flex-col">
        {children}
      </main>
      <SiteFooter />
      <Suspense>
        <ChatWidget />
      </Suspense>
    </>
  );
}
