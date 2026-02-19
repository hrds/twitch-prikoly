import "./App.css";
import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  isRegistered,
  register,
  unregister,
} from "@tauri-apps/plugin-global-shortcut";
import { LazyStore } from "@tauri-apps/plugin-store";

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

const HOTKEY = "Ctrl+Shift+L";
const SETTINGS_FILE = "settings.json";
const appWindow = getCurrentWindow();
const settingsStore = new LazyStore(SETTINGS_FILE);

function App() {
  const [isLocked, setIsLocked] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const isLockedRef = useRef(false);

  useEffect(() => {
    isLockedRef.current = isLocked;
  }, [isLocked]);

  const applyLockState = async (nextLocked: boolean, persist: boolean) => {
    await appWindow.setAlwaysOnTop(true);
    await appWindow.setResizable(!nextLocked);
    await invoke("set_click_through", { enabled: nextLocked });

    isLockedRef.current = nextLocked;
    setIsLocked(nextLocked);

    if (persist) {
      await settingsStore.set("isLocked", nextLocked);
      await settingsStore.save();
    }
  };

  useEffect(() => {
    let isMounted = true;

    const setup = async () => {
      await appWindow.setAlwaysOnTop(true);
      if (!isMounted) {
        return;
      }

      const maximized = await appWindow.isMaximized();
      if (isMounted) {
        setIsMaximized(maximized);
      }

      const storedLockState = await settingsStore.get<boolean>("isLocked");
      if (!isMounted) {
        return;
      }

      await applyLockState(storedLockState ?? false, false);
      if (!isMounted) {
        return;
      }

      if (await isRegistered(HOTKEY)) {
        await unregister(HOTKEY);
      }

      if (!isMounted) {
        return;
      }

      await register(HOTKEY, () => {
        void applyLockState(!isLockedRef.current, true);
      });

      if (isMounted) {
        setIsReady(true);
      }
    };

    void setup();

    return () => {
      isMounted = false;
      void unregister(HOTKEY);
    };
  }, []);

  const handleToggleLock = async () => {
    await applyLockState(!isLocked, true);
  };

  const handleMinimize = async () => {
    await appWindow.minimize();
  };

  const handleToggleMaximize = async () => {
    await appWindow.toggleMaximize();
    const maximized = await appWindow.isMaximized();
    setIsMaximized(maximized);
  };

  const handleClose = async () => {
    await appWindow.close();
  };

  return (
    <main className={`overlay ${isLocked ? "overlay-locked" : ""}`}>
      <div className="dragbar">
        {isLocked ? (
          <div className="dragbar-title">
            Chat Overlay <span className="lock-badge lock-badge-locked">Locked</span>
          </div>
        ) : (
          <div className="dragbar-title" data-tauri-drag-region>
            Chat Overlay <span className="lock-badge">Unlocked</span>
          </div>
        )}

        {!isLocked && (
          <div className="window-controls" role="toolbar" aria-label="Window controls">
            <button
              className="window-control window-control-lock"
              type="button"
              aria-label="Lock overlay"
              onClick={() => {
                void handleToggleLock();
              }}
            >
              Lock
            </button>
            <button
              className="window-control"
              type="button"
              aria-label="Minimize"
              onClick={() => {
                void handleMinimize();
              }}
            >
              -
            </button>
            <button
              className="window-control"
              type="button"
              aria-label={isMaximized ? "Restore" : "Maximize"}
              onClick={() => {
                void handleToggleMaximize();
              }}
            >
              {isMaximized ? "❐" : "□"}
            </button>
            <button
              className="window-control window-control-close"
              type="button"
              aria-label="Close"
              onClick={() => {
                void handleClose();
              }}
            >
              x
            </button>
          </div>
        )}
      </div>

      {isLocked && <div className="lock-hint">Locked - press {HOTKEY} to unlock</div>}
      {!isReady && <div className="lock-hint">Loading overlay settings...</div>}

      <section className="chat-messages" aria-label="Fake chat preview">
        {fakeMessages.map((message) => (
          <article className="chat-message" key={message.id}>
            <span className="username">{message.username}:</span>{" "}
            <span>{message.text}</span>
          </article>
        ))}
      </section>
    </main>
  );
}

export default App;
