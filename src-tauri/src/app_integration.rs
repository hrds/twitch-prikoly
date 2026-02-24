use tauri::{AppHandle, Manager, Runtime};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

pub fn register_lock_shortcut<R, M, F>(app: &M, on_toggle: F) -> tauri::Result<()>
where
    R: Runtime,
    M: Manager<R>,
    F: Fn(&AppHandle<R>) + Send + Sync + 'static,
{
    let ctrl_alt_l_shortcut = Shortcut::new(Some(Modifiers::ALT), Code::KeyL);

    app.global_shortcut()
        .on_shortcut("Ctrl+Alt+L", move |app, _, event| {
            if event.state == ShortcutState::Pressed {
                on_toggle(app);
            }
        })
        .map_err(|error| std::io::Error::other(format!("failed to register shortcut: {error}")))?;

    Ok(())
}
