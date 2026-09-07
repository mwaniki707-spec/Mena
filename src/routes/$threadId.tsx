import { createFileRoute } from "@tanstack/react-router";
import { ChatApp } from "@/components/chat-app";

export const Route = createFileRoute("/$threadId")({
  head: () => ({
    meta: [{ title: "Mena — Conversation" }],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { threadId } = Route.useParams();
  return <ChatApp threadId={threadId} />;
}
