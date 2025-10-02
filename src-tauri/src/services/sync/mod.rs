mod apple_notes;
mod markdown;

use crate::models::preferences::SyncPreferences;
use serde::Serialize;

pub use apple_notes::{
    check_permission as check_apple_notes_permission, list_folders as list_apple_notes_folders,
};

pub struct SyncService;

impl SyncService {
    pub fn sync_all(content: &str, prefs: &SyncPreferences) -> SyncResult<()> {
        if !prefs.is_any_enabled() {
            return Ok(());
        }

        for outcome in Self::sync_outcomes(content, prefs) {
            outcome.result?;
        }

        Ok(())
    }

    pub fn sync_outcomes(content: &str, prefs: &SyncPreferences) -> Vec<SyncOutcome> {
        let mut results = Vec::new();

        if prefs.markdown_enabled {
            results.push(SyncOutcome {
                target: SyncTarget::Markdown,
                result: markdown::export(content, prefs),
            });
        }

        if prefs.apple_notes_enabled {
            results.push(SyncOutcome {
                target: SyncTarget::AppleNotes,
                result: apple_notes::export(content, prefs),
            });
        }

        results
    }
}

pub type SyncResult<T> = Result<T, SyncError>;

#[derive(Debug)]
pub enum SyncError {
    Io(std::io::Error),
    NotConfigured(&'static str),
    #[cfg(not(target_os = "macos"))]
    NotImplemented(&'static str),
    PermissionDenied(String),
    AppleScript(String),
}

impl std::fmt::Display for SyncError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            SyncError::Io(err) => write!(f, "IO error: {}", err),
            SyncError::NotConfigured(detail) => write!(f, "Sync not configured: {}", detail),
            #[cfg(not(target_os = "macos"))]
            SyncError::NotImplemented(detail) => write!(f, "Sync not implemented: {}", detail),
            SyncError::PermissionDenied(detail) => {
                write!(f, "Permission denied while running sync: {}", detail)
            }
            SyncError::AppleScript(detail) => write!(f, "AppleScript failed: {}", detail),
        }
    }
}

impl std::error::Error for SyncError {}

impl From<std::io::Error> for SyncError {
    fn from(value: std::io::Error) -> Self {
        SyncError::Io(value)
    }
}

#[derive(Debug, Clone, Copy, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum SyncTarget {
    Markdown,
    AppleNotes,
}

impl SyncTarget {
    pub fn label(&self) -> &'static str {
        match self {
            SyncTarget::Markdown => "Markdown",
            SyncTarget::AppleNotes => "Apple Notes",
        }
    }
}

pub struct SyncOutcome {
    pub target: SyncTarget,
    pub result: SyncResult<()>,
}
