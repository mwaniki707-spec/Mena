import { createFileRoute } from "@tanstack/react-router";
import { ChatApp } from "@/components/chat-app";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mena — AI Chat" },
      {
        name: "description",
        content: "Chat with powerful AI models through Mena.",
      },
      { property: "og:title", content: "Mena — AI Chat" },
      {
        property: "og:description",
        content: "Chat with powerful AI models through Mena.",
      },
    ],
  }),
  component: () => <ChatApp />,
});
