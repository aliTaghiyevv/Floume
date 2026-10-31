import { useEffect, useRef, useState } from "react";
import { ArrowUp, Cpu, LoaderCircle, RotateCcw, SquarePen } from "lucide-react";
import { Flower, ShoppingCart, ArrowRight } from "./icons";
import { FlowDialog } from "./FlowDialog";
import flowerData from "../bouquet-data.json";

type ChatProduct = {
  id: string;
  name: string;
  price: number;
  image: string;
  storeName: string;
};
type Design = { flowers: { id: string; quantity: number }[]; note: string };
type Reply = {
  message: string;
  productIds: string[];
  suggestions: string[];
  design: Design | null;
  provider: string;
  model: string;
};
type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  reply?: Reply;
};
const welcomePrompts = [
  "Birthday bouquet",
  "150 ₼ — bouquet + perfume",
  "A gentle bouquet for mom",
  "Rose bouquet",
];
const storageKey = "floume-ai-conversation";
function restore(): Message[] {
  try {
    const items = JSON.parse(localStorage.getItem(storageKey) || "[]");
    return Array.isArray(items)
      ? items
          .filter(
            (m) =>
              m &&
              ["user", "assistant"].includes(m.role) &&
              typeof m.content === "string" &&
              typeof m.id === "string",
          )
          .slice(-24)
      : [];
  } catch {
    return [];
  }
}

export default function BouquetAssistant({
  onClose,
  onCustomize,
  onAdd,
  onView,
  products,
}: {
  onClose: () => void;
  onCustomize: (flowers: Record<string, number>) => void;
  onAdd: (id: string) => void;
  onView: (id: string) => void;
  products: ChatProduct[];
}) {
  const [messages, setMessages] = useState<Message[]>(restore);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [failedMessages, setFailedMessages] = useState<Message[] | null>(null);
  const [status, setStatus] = useState<{
    ready: boolean;
    model?: string;
    message?: string;
  } | null>(null);
  const sequence = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const list = useRef<HTMLDivElement>(null);
  const textbox = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(messages.slice(-24)));
  }, [messages]);
  useEffect(() => {
    const body = list.current?.closest(".flow-dialog-body");
    if (body) body.scrollTo({ top: body.scrollHeight, behavior: "smooth" });
  }, [messages, busy, error]);
  useEffect(() => {
    void checkStatus();
    const timer = setTimeout(() => textbox.current?.focus(), 80);
    return () => {
      clearTimeout(timer);
      sequence.current++;
      controller.current?.abort();
    };
  }, []);
  async function checkStatus() {
    try {
      const r = await fetch("/api/ai/status");
      const value = await r.json();
      setStatus({
        ready: r.ok && value.ready === true,
        model: value.model,
        message: value.error?.message || value.message,
      });
    } catch {
      setStatus({
        ready: false,
        message:
          "The local AI service is unavailable. Start Ollama and try again.",
      });
    }
  }
  async function request(history: Message[]) {
    const requestId = ++sequence.current;
    setBusy(true);
    setError("");
    setFailedMessages(null);
    const abort = new AbortController();
    controller.current = abort;
    const timer = setTimeout(() => abort.abort(), 125000);
    try {
      const r = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history
            .slice(-20)
            .map((m) => ({ role: m.role, content: m.content })),
        }),
        signal: abort.signal,
      });
      const response = await r.json();
      if (requestId !== sequence.current) return;
      if (!r.ok)
        throw new Error(
          response.error?.message ||
            "The local model could not complete this request. Please try again.",
        );
      if (
        typeof response.message !== "string" ||
        !Array.isArray(response.productIds) ||
        !Array.isArray(response.suggestions)
      )
        throw new Error(
          "The local model returned an incomplete response. Please try again.",
        );
      setMessages([
        ...history,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: response.message,
          reply: response,
        },
      ]);
      setStatus({ ready: true, model: response.model });
    } catch (e) {
      if (requestId !== sequence.current) return;
      if (abort.signal.aborted) {
        setError(
          "The local model took too long. Please try again with a shorter request.",
        );
      } else
        setError(
          e instanceof Error ? e.message : "Unable to reach the local model.",
        );
      setFailedMessages(history);
    } finally {
      clearTimeout(timer);
      if (controller.current === abort) controller.current = null;
      if (requestId === sequence.current) setBusy(false);
    }
  }
  function send(value = input) {
    const text = value.trim();
    if (!text || busy) return;
    const next = [
      ...messages,
      { id: crypto.randomUUID(), role: "user" as const, content: text },
    ];
    setMessages(next);
    setInput("");
    void request(next);
  }
  function newChat() {
    sequence.current++;
    controller.current?.abort();
    controller.current = null;
    setBusy(false);
    setMessages([]);
    setError("");
    setFailedMessages(null);
    setInput("");
    textbox.current?.focus();
  }
  const brand = (
    <div className="ai-header-brand" aria-hidden="true">
      <span className="ai-brand-icon">
        <Flower />
      </span>
      <div className="ai-brand-name">
        <strong>Floume AI</strong>
        <span className="ai-brand-status">
          {status?.ready === false ? "offline" : "online"}
        </span>
      </div>
    </div>
  );
  return (
    <FlowDialog
      title="Floume AI online"
      onClose={onClose}
      className={`ai-dialog ${messages.length ? "has-messages" : ""}`}
      headerExtra={
        <>
          {brand}
          {messages.length > 0 && (
            <button
              className="ai-new-chat"
              aria-label="New chat"
              title="New chat"
              onClick={newChat}
            >
              <SquarePen size={19} />
            </button>
          )}
        </>
      }
      footer={
        <>
          <form
            className="ai-composer"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <textarea
              ref={textbox}
              placeholder="Type a message…"
              aria-label="Type a message…"
              rows={1}
              maxLength={3000}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  !e.shiftKey &&
                  !e.nativeEvent.isComposing
                ) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <button
              className="ai-send"
              type="submit"
              aria-label="Send message"
              disabled={!input.trim() || busy}
            >
              {busy ? (
                <LoaderCircle size={20} className="ai-spinner" />
              ) : (
                <ArrowUp size={22} />
              )}
            </button>
          </form>
          <div
            className="ai-local-status"
            title={
              status?.model
                ? `Running ${status.model} on your Mac`
                : "Uses Ollama on your Mac"
            }
          >
            <Cpu />
            {status?.ready === false
              ? "Local AI is offline"
              : "Private local AI · no API fees"}
          </div>
        </>
      }
    >
      {!messages.length ? (
        <div className="ai-welcome">
          <div className="ai-welcome-icon">
            <Flower />
          </div>
          <h3>Hi, welcome</h3>
          <p>
            I build bouquets, find ready-made ones and gifts, and keep it within
            your budget.
          </p>
          <div className="ai-suggestions">
            {welcomePrompts.map((p) => (
              <button key={p} onClick={() => send(p)}>
                {p}
              </button>
            ))}
          </div>
          {status?.ready === false && (
            <div className="ai-offline-note">
              <p>{status.message}</p>
              <button onClick={() => void checkStatus()}>
                <RotateCcw size={13} />
                Check connection
              </button>
            </div>
          )}
        </div>
      ) : null}
      <div
        className="ai-messages"
        ref={list}
        aria-live="polite"
        aria-busy={busy}
      >
        {messages.map((m) =>
          m.role === "user" ? (
            <div className="ai-message ai-message-user" key={m.id}>
              {m.content}
            </div>
          ) : (
            <article className="ai-message ai-message-assistant" key={m.id}>
              {m.reply?.productIds?.length ? (
                <div className="ai-recommendations">
                  {m.reply.productIds
                    .map((id) => products.find((p) => p.id === id))
                    .filter((p): p is ChatProduct => !!p)
                    .map((p) => (
                      <article
                        className="ai-product"
                        aria-label={p.name}
                        key={p.id}
                      >
                        <button
                          className="ai-product-image"
                          aria-label={`View ${p.name}`}
                          onClick={() => onView(p.id)}
                        >
                          <img src={p.image} alt={p.name} />
                        </button>
                        <div className="ai-product-content">
                          <h3>{p.name}</h3>
                          <p>{p.storeName}</p>
                          <strong>₼{p.price.toFixed(2)}</strong>
                          <button
                            className="ai-product-cart"
                            onClick={() => onAdd(p.id)}
                          >
                            <ShoppingCart size={16} />
                            Add to cart
                          </button>
                        </div>
                      </article>
                    ))}
                </div>
              ) : null}
              <p>{m.content}</p>
              {m.reply?.design && m.reply.design.flowers.length > 0 && (
                <div className="ai-design">
                  <div className="ai-design-title">
                    <Flower size={20} />
                    Your custom bouquet
                  </div>
                  {m.reply.design.flowers.map((item) => {
                    const f = flowerData.flowers.find((f) => f.id === item.id);
                    return f ? (
                      <div className="ai-design-row" key={item.id}>
                        <img src={f.image} alt="" />
                        <span>{f.name}</span>
                        <strong>×{item.quantity}</strong>
                      </div>
                    ) : null;
                  })}
                  {m.reply.design.note && <p>{m.reply.design.note}</p>}
                  <button
                    className="primary-button"
                    onClick={() =>
                      onCustomize(
                        Object.fromEntries(
                          m.reply!.design!.flowers.map((f) => [
                            f.id,
                            f.quantity,
                          ]),
                        ),
                      )
                    }
                  >
                    Customize this bouquet
                    <ArrowRight size={17} />
                  </button>
                  <div className="ai-preview-label">
                    Choose a florist, base, and finishing touches next.
                  </div>
                </div>
              )}
              {m.reply?.suggestions?.length ? (
                <div className="ai-suggestions ai-followups">
                  {m.reply.suggestions.slice(0, 4).map((s) => (
                    <button key={s} disabled={busy} onClick={() => send(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              ) : null}
            </article>
          ),
        )}
        {busy && (
          <div className="ai-thinking" role="status">
            <LoaderCircle size={16} />
            Thinking…
          </div>
        )}
        {error && (
          <div className="ai-error" role="alert">
            {error}
            {failedMessages && (
              <button onClick={() => void request(failedMessages)}>
                <RotateCcw size={14} />
                Try again
              </button>
            )}
          </div>
        )}
      </div>
    </FlowDialog>
  );
}
