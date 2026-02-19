#[tauri::command]
fn set_overlay_locked(window: tauri::WebviewWindow, locked: bool) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use windows_sys::Win32::Foundation::HWND;
        use windows_sys::Win32::UI::WindowsAndMessaging::{
            GetWindowLongW, SetWindowLongW, SetWindowPos, GWL_EXSTYLE, HWND_TOPMOST,
            SWP_FRAMECHANGED, SWP_NOACTIVATE, SWP_NOMOVE, SWP_NOSIZE, WS_EX_LAYERED,
            WS_EX_TRANSPARENT,
        };

        let hwnd = window.hwnd().map_err(|err| err.to_string())?;
        let hwnd_ptr = hwnd.0 as HWND;

        // SAFETY: hwnd_ptr comes from Tauri for a live window handle owned by this process.
        let ex_style = unsafe { GetWindowLongW(hwnd_ptr, GWL_EXSTYLE) } as u32;
        let mut new_style = ex_style | WS_EX_LAYERED;

        if locked {
            new_style |= WS_EX_TRANSPARENT;
        } else {
            new_style &= !WS_EX_TRANSPARENT;
        }

        // SAFETY: style updates are applied to the same valid HWND and then refreshed with SetWindowPos.
        unsafe {
            SetWindowLongW(hwnd_ptr, GWL_EXSTYLE, new_style as i32);
            SetWindowPos(
                hwnd_ptr,
                HWND_TOPMOST,
                0,
                0,
                0,
                0,
                SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE | SWP_FRAMECHANGED,
            );
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        let _ = (window, locked);
    }

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_store::Builder::new().build())
        .invoke_handler(tauri::generate_handler![set_overlay_locked]);

    #[cfg(debug_assertions)]
    {
        builder = builder.plugin(tauri_plugin_mcp_bridge::init());
    }

    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
