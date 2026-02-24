import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Card } from "@/components/ui/card";
import { Toggle } from "@/components/ui/toggle";
import { LockIcon } from "@/components/ui/lock";
import { LockOpenIcon } from "@/components/ui/lock-open";
import { cn } from "@/lib/utils";

type ChatMessage = {
  id: string;
  username: string;
  text: string;
};

const fakeMessages: ChatMessage[] = [
  { id: "1", username: "user1", text: "Hello everyone!" },
  { id: "2", username: "user2", text: "This is amazing" },
  { id: "3", username: "user3", text: "PogChamp" },
  { id: "4", username: "user4", text: "Nice overlay!" },
  { id: "5", username: "user5", text: "Let's go 🚀" },
];

interface TopBarProps {
  isLocked: boolean;
  isBusy: boolean;
  onToggleLock: () => void;
}

function TopBar({ isLocked, isBusy, onToggleLock }: TopBarProps) {
  return (
    <div className="dragbar" role="toolbar" aria-label="Overlay controls">
      <div className="dragbar-title">Chat Overlay</div>

      <Toggle
        className={cn(
          "h-8 w-8 rounded-full p-0",
          isLocked
            ? "border border-amber-300/40 bg-amber-400/10 text-amber-100 shadow-[0_0_18px_rgba(251,191,36,0.25)] hover:bg-amber-400/20 data-[state=on]:bg-amber-400/15 data-[state=on]:text-amber-100"
            : "border border-emerald-300/30 bg-emerald-400/10 text-emerald-100 shadow-[0_0_18px_rgba(16,185,129,0.25)] hover:bg-emerald-400/20 data-[state=off]:bg-emerald-400/10 data-[state=off]:text-emerald-100",
          isBusy && "opacity-60 pointer-events-none",
        )}
        aria-label={isLocked ? "Unlock overlay" : "Lock overlay"}
        pressed={isLocked}
        onPressedChange={onToggleLock}
        disabled={isBusy}
      >
        {isLocked ? (
          <LockIcon
            aria-hidden="true"
            className="pointer-events-none"
            size={16}
          />
        ) : (
          <LockOpenIcon
            aria-hidden="true"
            className="pointer-events-none"
            size={16}
          />
        )}
        <span className="sr-only">
          {isLocked ? "Unlock overlay" : "Lock overlay"}
        </span>
      </Toggle>
    </div>
  );
}

function ChatPreview({ messages }: { messages: ChatMessage[] }) {
  return (
    <section className="flex flex-col gap-2" aria-label="Fake chat preview">
      {messages.map((message) => (
        <Card className="chat-card" key={message.id}>
          <div className="relative z-10 flex gap-2">
            <span className="chat-username">{message.username}:</span>
            <span className="text-white/90">{message.text}</span>
          </div>
        </Card>
      ))}
    </section>
  );
}

export default function App() {
  const [isLocked, setIsLocked] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    void listen<boolean>("overlay-lock-changed", (event) => {
      setIsLocked(event.payload);
    }).then((fn) => {
      unlisten = fn;
    });

    void invoke<boolean>("get_overlay_locked")
      .then((locked) => setIsLocked(locked))
      .catch((err) => {
        console.error("get_overlay_locked failed:", err);
      });

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, []);

  const handleToggleLock = useCallback(() => {
    if (isBusy) return;

    setIsBusy(true);

    // Backend returns the NEW locked state (bool) from toggle_overlay_lock
    invoke<boolean>("toggle_overlay_lock")
      .then((next) => setIsLocked(next))
      .catch((err) => {
        console.error("toggle_overlay_lock failed:", err);
        // Keep UI state as-is if backend failed.
      })
      .finally(() => setIsBusy(false));
  }, [isBusy]);

  return (
    <main className="overlay-shell">
      <span className="neon-orb" />
      <span className="neon-orb orb-right" />

      <div className="relative z-10 flex flex-col gap-3">
        <TopBar
          isLocked={isLocked}
          isBusy={isBusy}
          onToggleLock={handleToggleLock}
        />
        <ChatPreview messages={fakeMessages} />
      </div>
    </main>
  );
}
