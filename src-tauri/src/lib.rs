use std::sync::Mutex;

use tauri::Emitter;
use tauri::Manager;

mod app_integration;
#[cfg(target_os = "windows")]
mod windows_overlay;

#[derive(Default)]
pub(crate) struct OverlayState {
    locked: bool,
}

// ------------------------------------------------------------
// Commands
// ------------------------------------------------------------
fn apply_overlay_lock<R: tauri::Runtime>(
    window: &tauri::WebviewWindow<R>,
    locked: bool,
) -> Result<(), String> {
    window
        .set_always_on_top(locked)
        .map_err(|e| format!("failed to set always-on-top={locked}: {e}"))?;

    #[cfg(target_os = "windows")]
    {
        windows_overlay::apply_locked_style(window, locked)?;
    }

    #[cfg(not(target_os = "windows"))]
    {
        let _ = (window, locked);
    }

    Ok(())
}

fn set_overlay_lock_state<R: tauri::Runtime>(
    window: tauri::WebviewWindow<R>,
    state: &Mutex<OverlayState>,
    locked: bool,
) -> Result<bool, String> {
    let mut st = state
        .lock()
        .map_err(|_| "failed to lock overlay state".to_string())?;

    apply_overlay_lock(&window, locked)?;
    st.locked = locked;

    if let Err(error) = window.emit("overlay-lock-changed", st.locked) {
        eprintln!("[overlay][events] failed to emit lock state: {error}");
    }

    Ok(st.locked)
}

fn toggle_overlay_lock_state<R: tauri::Runtime>(
    window: tauri::WebviewWindow<R>,
    state: &Mutex<OverlayState>,
) -> Result<bool, String> {
    let mut st = state
        .lock()
        .map_err(|_| "failed to lock overlay state".to_string())?;

    let next_locked = !st.locked;
    apply_overlay_lock(&window, next_locked)?;
    st.locked = next_locked;

    if let Err(error) = window.emit("overlay-lock-changed", st.locked) {
        eprintln!("[overlay][events] failed to emit lock state: {error}");
    }

    Ok(next_locked)
}

fn toggle_overlay_lock_from_shortcut<R: tauri::Runtime>(app: &tauri::AppHandle<R>) {
    if let Some(win) = app.get_webview_window("main") {
        let state = app.state::<Mutex<OverlayState>>();
        if let Err(error) = toggle_overlay_lock_state(win, state.inner()) {
            eprintln!("[overlay][shortcut] failed to toggle lock: {error}");
        }
    } else {
        eprintln!("[overlay][shortcut] main window is missing");
    }
}

#[tauri::command]
fn set_overlay_locked(
    window: tauri::WebviewWindow,
    locked: bool,
    state: tauri::State<'_, Mutex<OverlayState>>,
) -> Result<(), String> {
    set_overlay_lock_state(window, state.inner(), locked).map(|_| ())
}

#[tauri::command]
fn toggle_overlay_lock(
    window: tauri::WebviewWindow,
    state: tauri::State<'_, Mutex<OverlayState>>,
) -> Result<bool, String> {
    toggle_overlay_lock_state(window, state.inner())
}

#[tauri::command]
fn get_overlay_locked(state: tauri::State<'_, Mutex<OverlayState>>) -> Result<bool, String> {
    let st = state
        .lock()
        .map_err(|_| "failed to lock overlay state".to_string())?;
    Ok(st.locked)
}

// ------------------------------------------------------------
// App run
// ------------------------------------------------------------
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .manage(Mutex::new(OverlayState::default()))
        .invoke_handler(tauri::generate_handler![
            set_overlay_locked,
            toggle_overlay_lock,
            get_overlay_locked
        ])
        .setup(|app| {
            app_integration::register_lock_shortcut(app, toggle_overlay_lock_from_shortcut)?;

            #[cfg(target_os = "windows")]
            {
                if let Some(window) = app.get_webview_window("main") {
                    if let Err(error) = windows_overlay::setup_locked_topmost_heartbeat(
                        app.handle().clone(),
                        window,
                    ) {
                        eprintln!("[overlay][windows] failed to setup topmost heartbeat: {error}");
                    }
                } else {
                    eprintln!("[overlay][windows] main window is missing");
                }
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
