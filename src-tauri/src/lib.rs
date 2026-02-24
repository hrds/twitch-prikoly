use std::sync::atomic::{AtomicBool, Ordering};

use tauri::Emitter;
use tauri::Manager;

mod app_integration;
#[cfg(target_os = "windows")]
mod windows_overlay;

#[derive(Default)]
pub(crate) struct AppState {
    locked: AtomicBool,
}

// ------------------------------------------------------------
// Commands
// ------------------------------------------------------------
fn apply_overlay_lock<R: tauri::Runtime>(
    window: &tauri::WebviewWindow<R>,
    locked: bool,
) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        windows_overlay::apply_locked_style(window, locked)?;
    }

    Ok(())
}

fn set_locked<R: tauri::Runtime>(
    window: tauri::WebviewWindow<R>,
    state: &AppState,
    locked: bool,
) -> Result<bool, String> {
    apply_overlay_lock(&window, locked)?;

    state.locked.store(locked, Ordering::Relaxed);

    let _ = window.emit("overlay-lock-changed", locked);

    Ok(locked)
}

fn toggle_locked<R: tauri::Runtime>(
    window: tauri::WebviewWindow<R>,
    state: &AppState,
) -> Result<bool, String> {
    let next = !state.locked.load(Ordering::Relaxed);
    set_locked(window, state, next)
}

fn toggle_overlay_lock_from_shortcut<R: tauri::Runtime>(app: &tauri::AppHandle<R>) {
    if let Some(win) = app.get_webview_window("main") {
        let state = app.state::<AppState>();
        if let Err(error) = toggle_locked(win, state.inner()) {
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
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    set_locked(window, state.inner(), locked).map(|_| ())
}

#[tauri::command]
fn toggle_overlay_lock(
    window: tauri::WebviewWindow,
    state: tauri::State<'_, AppState>,
) -> Result<bool, String> {
    toggle_locked(window, state.inner())
}

#[tauri::command]
fn get_overlay_locked(state: tauri::State<'_, AppState>) -> Result<bool, String> {
    Ok(state.locked.load(Ordering::Relaxed))
}

// ------------------------------------------------------------
// App run
// ------------------------------------------------------------
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            set_overlay_locked,
            toggle_overlay_lock,
            get_overlay_locked
        ])
        .setup(|app| {
            app_integration::register_shortcuts(app, toggle_overlay_lock_from_shortcut)?;

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
        .expect("error while running tauri application")
}
