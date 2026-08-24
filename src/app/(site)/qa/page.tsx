"use client";

import * as React from "react";
import Link from "next/link";
import { MessageCircle, Send, Plus, ExternalLink } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useChatSessionsQuery, useChatSessionDetailQuery, useAskQuestionMutation } from "@/lib/query/use-chat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Citation } from "@/lib/schemas/chat.schema";

interface DisplayMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
}

export default function QaPage() {
  const { user, isLoading } = useAuth();
  const [activeSessionId, setActiveSessionId] = React.useState<string | null>(null);
  const [question, setQuestion] = React.useState("");
  const [pendingMessages, setPendingMessages] = React.useState<DisplayMessage[]>([]);

  const sessionsQuery = useChatSessionsQuery(!!user);
  const detailQuery = useChatSessionDetailQuery(activeSessionId);
  const askMutation = useAskQuestionMutation();

  const historyMessages: DisplayMessage[] = React.useMemo(
    () => (detailQuery.data?.messages ?? []).map((m) => ({ id: m.id, role: m.role, content: m.content })),
    [detailQuery.data]
  );
  const messages = activeSessionId ? [...historyMessages, ...pendingMessages] : pendingMessages;

  function handleNewChat() {
    setActiveSessionId(null);
    setPendingMessages([]);
  }

  function handleSelectSession(id: string) {
    setActiveSessionId(id);
    setPendingMessages([]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = question.trim();
    if (!q || askMutation.isPending) return;
    setQuestion("");
    setPendingMessages((prev) => [...prev, { id: `local-${Date.now()}-q`, role: "user", content: q }]);

    try {
      const result = await askMutation.mutateAsync({ sessionId: activeSessionId ?? undefined, question: q });
      setPendingMessages((prev) => [
        ...prev,
        { id: `local-${Date.now()}-a`, role: "assistant", content: result.answer, citations: result.citations },
      ]);
      setActiveSessionId(result.sessionId);
    } catch {
      setPendingMessages((prev) => [
        ...prev,
        { id: `local-${Date.now()}-e`, role: "assistant", content: "답변 생성에 실패했습니다. 잠시 후 다시 시도해주세요." },
      ]);
    }
  }

  if (!isLoading && !user) {
    return (
      <div className="container flex flex-col items-center gap-4 py-24 text-center">
        <MessageCircle className="h-10 w-10 text-muted-foreground" />
        <h1 className="text-page-title">AI 질의응답</h1>
        <p className="text-sm text-muted-foreground">로그인한 임직원만 사용할 수 있습니다.</p>
        <Button asChild>
          <Link href="/login">로그인하러 가기</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container grid gap-6 py-8 lg:grid-cols-[240px_1fr]">
      <aside className="hidden flex-col gap-2 lg:flex">
        <Button variant="outline" size="sm" className="justify-start gap-2" onClick={handleNewChat}>
          <Plus className="h-4 w-4" /> 새 대화
        </Button>
        <div className="flex flex-col gap-1">
          {(sessionsQuery.data ?? []).map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => handleSelectSession(s.id)}
              className={cn(
                "truncate rounded-lg px-3 py-2 text-left text-sm hover:bg-muted",
                activeSessionId === s.id && "bg-muted font-medium"
              )}
            >
              {s.title || "새 대화"}
            </button>
          ))}
        </div>
      </aside>

      <div className="flex min-h-[70vh] flex-col">
        <div>
          <h1 className="flex items-center gap-2 text-page-title">
            <MessageCircle className="h-6 w-6 text-primary" /> AI 질의응답
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            수집된 뉴스를 근거로만 답합니다. 답변의 각주 번호는 원문 기사로 연결됩니다.
          </p>
        </div>

        <div className="mt-6 flex-1 space-y-4">
          {messages.length === 0 && (
            <p className="py-12 text-center text-sm text-muted-foreground">
              궁금한 내용을 물어보세요. 예: &quot;이번 주 저축은행 대출 규제 관련 뉴스 요약해줘&quot;
            </p>
          )}
          {messages.map((m) => (
            <ChatBubble key={m.id} message={m} />
          ))}
          {askMutation.isPending && (
            <div className="max-w-[85%] rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">
              답변 생성 중...
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="sticky bottom-4 mt-4 flex gap-2">
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="질문을 입력하세요"
            aria-label="질문"
            disabled={askMutation.isPending}
          />
          <Button type="submit" disabled={askMutation.isPending || !question.trim()} aria-label="전송">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}

function ChatBubble({ message }: { message: DisplayMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted"
        )}
      >
        {message.content}
        {message.citations && message.citations.length > 0 && (
          <div className="mt-3 flex flex-col gap-1 border-t border-border/50 pt-2">
            {message.citations.map((c) => (
              <Link
                key={c.index}
                href={`/news/${c.articleId}`}
                target="_blank"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline"
              >
                <ExternalLink className="h-3 w-3" /> [{c.index}] {c.title}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
