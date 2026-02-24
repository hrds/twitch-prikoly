use std::sync::Mutex;

use tauri::{AppHandle, Manager, Runtime, WebviewWindow};

use crate::OverlayState;

const TOPMOST_REASSERT_MS: u64 = 1200;

mod win {
    use windows_sys::Win32::Foundation::HWND;
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        GetWindowLongW, SetWindowLongW, SetWindowPos, GWL_EXSTYLE, HWND_NOTOPMOST, HWND_TOPMOST,
        SWP_FRAMECHANGED, SWP_NOACTIVATE, SWP_NOMOVE, SWP_NOOWNERZORDER, SWP_NOSENDCHANGING,
        SWP_NOSIZE, WS_EX_LAYERED, WS_EX_NOACTIVATE, WS_EX_TRANSPARENT,
    };

    fn validate_hwnd(hwnd: HWND) -> Result<(), String> {
        if hwnd == 0 {
            return Err("invalid window handle".to_string());
        }

        Ok(())
    }

    unsafe fn ensure_topmost_unchecked(hwnd: HWND) {
        SetWindowPos(
            hwnd,
            HWND_TOPMOST,
            0,
            0,
            0,
            0,
            SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE | SWP_NOSENDCHANGING | SWP_NOOWNERZORDER,
        );
    }

    pub fn ensure_topmost_checked(hwnd: HWND) -> Result<(), String> {
        validate_hwnd(hwnd)?;

        // SAFETY: `validate_hwnd` verifies we do not pass a null HWND.
        unsafe {
            ensure_topmost_unchecked(hwnd);
        }

        Ok(())
    }

    unsafe fn set_locked_unchecked(hwnd: HWND, locked: bool) {
        let ex_style = GetWindowLongW(hwnd, GWL_EXSTYLE) as u32;

        let mut new_style = ex_style | WS_EX_LAYERED;
        if locked {
            new_style |= WS_EX_TRANSPARENT | WS_EX_NOACTIVATE;
        } else {
            new_style &= !(WS_EX_TRANSPARENT | WS_EX_NOACTIVATE);
        }

        let insert_after = if locked { HWND_TOPMOST } else { HWND_NOTOPMOST };
        let mut flags =
            SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE | SWP_NOSENDCHANGING | SWP_NOOWNERZORDER;

        if new_style != ex_style {
            SetWindowLongW(hwnd, GWL_EXSTYLE, new_style as i32);
            flags |= SWP_FRAMECHANGED;
        }

        SetWindowPos(hwnd, insert_after, 0, 0, 0, 0, flags);
    }

    pub fn set_locked_checked(hwnd: HWND, locked: bool) -> Result<(), String> {
        validate_hwnd(hwnd)?;

        // SAFETY: `validate_hwnd` verifies we do not pass a null HWND.
        unsafe {
            set_locked_unchecked(hwnd, locked);
        }

        Ok(())
    }
}

pub fn apply_locked_style<R: Runtime>(
    window: &WebviewWindow<R>,
    locked: bool,
) -> Result<(), String> {
    use windows_sys::Win32::Foundation::HWND;

    let hwnd = window
        .hwnd()
        .map_err(|e| format!("failed to get window handle: {e}"))?;
    let hwnd_ptr = hwnd.0 as HWND;

    win::set_locked_checked(hwnd_ptr, locked)
}

pub fn setup_locked_topmost_heartbeat<R: Runtime>(
    app: AppHandle<R>,
    window: WebviewWindow<R>,
) -> Result<(), String> {
    use std::{thread, time::Duration};
    use windows_sys::Win32::Foundation::HWND;

    let hwnd_isize: isize = window
        .hwnd()
        .map_err(|e| format!("failed to get window handle: {e}"))?
        .0 as isize;

    thread::spawn(move || loop {
        let state = app.state::<Mutex<OverlayState>>();
        let locked = match state.lock() {
            Ok(st) => st.locked,
            Err(_) => false,
        };

        if locked {
            if let Err(error) = win::ensure_topmost_checked(hwnd_isize as HWND) {
                eprintln!("[overlay][windows] failed to reassert topmost: {error}");
            }
        }

        thread::sleep(Duration::from_millis(TOPMOST_REASSERT_MS));
    });

    Ok(())
}
