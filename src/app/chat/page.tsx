import type { Metadata } from "next";

import { ChatWorkspace } from "@/components/chat-workspace";

export const metadata: Metadata = {
  title: "Source-Grounded Chat",
  description:
    "Ask academic planning questions with answers grounded in curated Auburn sources.",
};

export default function ChatPage() {
  return <ChatWorkspace />;
}
