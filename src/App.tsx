import { useCallback, useEffect, useReducer, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { LazyStore } from "@tauri-apps/plugin-store";
import { Card } from "@/components/ui/card";
import { LockIcon } from "@/components/ui/lock";
import { LockOpenIcon } from "@/components/ui/lock-open";
import { Toggle } from "@/components/ui/toggle";
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

const SETTINGS_FILE = "settings.json";
const isTauriRuntime =
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

type WindowState = {
  isLocked: boolean;
  isReady: boolean;
};

type WindowAction =
  | { type: "SET_LOCKED"; payload: boolean }
  | { type: "SET_READY"; payload: boolean };

function windowReducer(state: WindowState, action: WindowAction): WindowState {
  switch (action.type) {
    case "SET_LOCKED":
      return { ...state, isLocked: action.payload };
    case "SET_READY":
      return { ...state, isReady: action.payload };
    default:
      return state;
  }
}

interface TopBarProps {
  isLocked: boolean;
  onToggleLock: () => Promise<void>;
}

function TopBar({ isLocked, onToggleLock }: TopBarProps) {
  return (
    <div className="dragbar" role="toolbar" aria-label="Overlay controls">
      <div className="dragbar-title">Chat Overlay</div>
      <Toggle
        className={cn(
          "h-8 w-8 rounded-full p-0",
          isLocked
            ? "border border-amber-300/40 bg-amber-400/10 text-amber-100 shadow-[0_0_18px_rgba(251,191,36,0.25)] hover:bg-amber-400/20 data-[state=on]:bg-amber-400/15 data-[state=on]:text-amber-100"
            : "border border-emerald-300/30 bg-emerald-400/10 text-emerald-100 shadow-[0_0_18px_rgba(16,185,129,0.25)] hover:bg-emerald-400/20 data-[state=off]:bg-emerald-400/10 data-[state=off]:text-emerald-100",
        )}
        aria-label={isLocked ? "Unlock overlay" : "Lock overlay"}
        pressed={isLocked}
        onPressedChange={() => {
          void onToggleLock();
        }}
      >
        {isLocked ? (
          <LockIcon aria-hidden="true" className="pointer-events-none" size={16} />
        ) : (
          <LockOpenIcon
            aria-hidden="true"
            className="pointer-events-none"
            size={16}
          />
        )}
        <span className="sr-only">{isLocked ? "Unlock overlay" : "Lock overlay"}</span>
      </Toggle>
    </div>
  );
}

interface ChatPreviewProps {
  messages: ChatMessage[];
}

function ChatPreview({ messages }: ChatPreviewProps) {
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

function App() {
  const [state, dispatch] = useReducer(windowReducer, {
    isLocked: false,
    isReady: false,
  });

  const appWindowRef = useRef<ReturnType<typeof getCurrentWindow> | null>(null);
  const settingsStoreRef = useRef<LazyStore | null>(null);

  const applyLockState = useCallback(
    async (nextLocked: boolean, persist: boolean) => {
      const appWindow = appWindowRef.current;
      const settingsStore = settingsStoreRef.current;
      if (!appWindow || !settingsStore) {
        return;
      }

      try {
        await appWindow.setDecorations(!nextLocked);
        await invoke("set_overlay_locked", { locked: nextLocked });

        dispatch({ type: "SET_LOCKED", payload: nextLocked });

        if (persist) {
          await settingsStore.set("isLocked", nextLocked);
          await settingsStore.save();
        }
      } catch (error) {
        console.error("Failed to apply lock state", error);
      }
    },
    [],
  );

  const handleToggleLock = useCallback(async () => {
    await applyLockState(!state.isLocked, true);
  }, [applyLockState, state.isLocked]);

  useEffect(() => {
    const abortController = new AbortController();

    const setup = async () => {
      try {
        if (!isTauriRuntime) {
          return;
        }

        appWindowRef.current = getCurrentWindow();
        settingsStoreRef.current = new LazyStore(SETTINGS_FILE);

        const settingsStore = settingsStoreRef.current;
        if (!settingsStore) {
          return;
        }

        const storedLockState = await settingsStore.get<boolean>("isLocked");
        if (abortController.signal.aborted) {
          return;
        }

        await applyLockState(storedLockState ?? false, false);
      } catch (error) {
        console.error("Failed to initialize overlay window", error);
      } finally {
        if (!abortController.signal.aborted) {
          dispatch({ type: "SET_READY", payload: true });
        }
      }
    };

    void setup();

    return () => {
      abortController.abort();
    };
  }, [applyLockState]);

  return (
    <main className={cn("overlay-shell", state.isLocked && "overlay-locked")}>
      <span className="neon-orb" />
      <span className="neon-orb orb-right" />

      <div className="relative z-10 flex flex-col gap-3">
        <TopBar isLocked={state.isLocked} onToggleLock={handleToggleLock} />

        {state.isLocked && (
          <div className="hint-banner" aria-live="polite">
            Locked mode enabled: native title bar is hidden
          </div>
        )}
        {!state.isLocked && (
          <div className="hint-banner" aria-live="polite">
            Unlocked mode: use native window controls in the title bar
          </div>
        )}
        {!state.isReady && (
          <div className="hint-banner" aria-live="polite">
            Loading overlay settings...
          </div>
        )}

        <ChatPreview messages={fakeMessages} />
      </div>
    </main>
  );
}

export default App;
