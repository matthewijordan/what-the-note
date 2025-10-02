pub mod preferences;
pub mod shortcuts;
pub mod storage;
pub mod sync;
pub mod tray;

#[cfg(target_os = "macos")]
pub mod hotcorner;

#[cfg(test)]
pub(crate) mod sample;
