import { ChatWorkspace } from "@/components/chat-workspace";
import { buildPageMetadata } from "@/lib/site-metadata";

export const metadata = buildPageMetadata({
  title: "Source-Grounded Chat",
  description:
    "Ask academic planning questions with answers grounded in curated Auburn sources.",
  path: "/chat",
});

export default function ChatPage() {
  return <ChatWorkspace />;
}
