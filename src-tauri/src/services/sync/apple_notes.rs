use super::{SyncError, SyncResult};
use crate::models::preferences::SyncPreferences;
use chrono::Utc;
use log::debug;
#[cfg(not(target_os = "macos"))]
use log::warn;
use regex::Regex;
use std::process::{Command, Stdio};

pub fn export(content: &str, prefs: &SyncPreferences) -> SyncResult<()> {
    #[cfg(target_os = "macos")]
    {
        ensure_notes_running()?;

        let folder_name = prefs.apple_notes_folder.trim();
        if folder_name.is_empty() {
            return Err(SyncError::NotConfigured(
                "Apple Notes folder must be specified",
            ));
        }

        let note_title = match prefs.apple_notes_title.trim() {
            "" => "What The Note",
            other => other,
        };

        let sanitized = sanitize_html_for_notes(content);
        let without_heading = strip_leading_matching_heading(&sanitized, note_title);
        let body_only = if without_heading.trim().is_empty() {
            "<div></div>"
        } else {
            without_heading.trim()
        };

        let metadata_html = if prefs.include_metadata {
            let timestamp = Utc::now().to_rfc3339();
            format!(
                "<p style=\"font-size:11px;color:#6e6e73;margin:8px 0;\"><em>Synced from What The Note • {}</em></p>",
                timestamp
            )
        } else {
            String::new()
        };

        let full_body = format!("<h1>{}</h1>{}{}", note_title, metadata_html, body_only);
        let script = build_update_script(note_title, folder_name, &full_body);

        match run_osascript(&script) {
            Ok(_) => Ok(()),
            Err(SyncError::AppleScript(message))
                if message.contains("Apple Notes folder not found") =>
            {
                Err(SyncError::NotConfigured(
                    "Apple Notes folder does not exist",
                ))
            }
            Err(err) => Err(err),
        }
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = content;
        let _ = prefs;
        warn!("Apple Notes sync is only available on macOS");
        Err(SyncError::NotImplemented(
            "Apple Notes sync is only available on macOS",
        ))
    }
}

#[cfg(target_os = "macos")]
const PERMISSION_PROBE_SCRIPT: &str = r#"
try
    tell application "Notes" to return true
on error errMsg number errNum
    error errMsg number errNum
end try
"#;

#[cfg(target_os = "macos")]
const LAUNCH_NOTES_SCRIPT: &str = r#"
tell application "Notes"
    if it is not running then
        launch
    end if
end tell
"#;

#[cfg(target_os = "macos")]
const LIST_FOLDERS_SCRIPT: &str = r#"
try
    tell application "Notes"
        set folderNames to name of folders of default account
        return folderNames
    end tell
on error errMsg number errNum
    error errMsg number errNum
end try
"#;

#[cfg(target_os = "macos")]
fn run_osascript(script: &str) -> SyncResult<String> {
    let child = Command::new("osascript")
        .arg("-e")
        .arg(script)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(SyncError::Io)?;

    let output = child.wait_with_output().map_err(SyncError::Io)?;

    if output.status.success() {
        debug!("AppleScript completed successfully");
        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        return Ok(stdout);
    }

    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    if stderr.contains("-1743") || stderr.to_lowercase().contains("not authorised") {
        return Err(SyncError::PermissionDenied(
            "macOS blocked automation access to Notes".to_string(),
        ));
    }

    Err(SyncError::AppleScript(stderr.trim().to_string()))
}

#[cfg(target_os = "macos")]
pub fn check_permission() -> SyncResult<()> {
    run_osascript(PERMISSION_PROBE_SCRIPT).map(|_| ())
}

#[cfg(not(target_os = "macos"))]
pub fn check_permission() -> SyncResult<()> {
    Err(SyncError::NotImplemented(
        "Apple Notes sync is only available on macOS",
    ))
}

#[cfg(target_os = "macos")]
#[allow(dead_code)]
pub fn ensure_notes_running() -> SyncResult<()> {
    run_osascript(LAUNCH_NOTES_SCRIPT).map(|_| ())
}

#[cfg(not(target_os = "macos"))]
#[allow(dead_code)]
pub fn ensure_notes_running() -> SyncResult<()> {
    Err(SyncError::NotImplemented(
        "Apple Notes sync is only available on macOS",
    ))
}

#[cfg(target_os = "macos")]
pub fn list_folders() -> SyncResult<Vec<String>> {
    ensure_notes_running()?;
    let output = run_osascript(LIST_FOLDERS_SCRIPT)?;
    Ok(parse_applescript_list(&output))
}

#[cfg(not(target_os = "macos"))]
pub fn list_folders() -> SyncResult<Vec<String>> {
    Err(SyncError::NotImplemented(
        "Apple Notes sync is only available on macOS",
    ))
}

pub fn sanitize_html_for_notes(html: &str) -> String {
    let mut sanitized = html.to_string();

    let attrs_to_strip = [
        (" data-type=\"taskItem\"", ""),
        (" data-type=\"taskList\"", ""),
        (" data-checked=\"true\"", ""),
        (" data-checked=\"false\"", ""),
        (" data-text-style=\"\"", ""),
    ];

    for (needle, replacement) in attrs_to_strip {
        sanitized = sanitized.replace(needle, replacement);
    }

    let label_regex = Regex::new(r"(?is)<label[^>]*?>.*?</label>").expect("valid regex");
    sanitized = label_regex.replace_all(&sanitized, "").into_owned();

    let checkbox_regex =
        Regex::new(r#"(?is)<input[^>]*type="checkbox"[^>]*/?>"#).expect("valid regex");
    sanitized = checkbox_regex.replace_all(&sanitized, "").into_owned();

    let content_cleanup_regex = Regex::new(
        r#"(?is)<div[^>]*class="content"[^>]*>(.*?)<ul[^>]*?>.*?</ul></div>"#,
    )
    .expect("valid regex");
    sanitized = content_cleanup_regex
        .replace_all(&sanitized, |caps: &regex::Captures| {
            format!(
                "<div class=\"content\">{}</div>",
                caps.get(1).map(|m| m.as_str().trim()).unwrap_or("")
            )
        })
        .into_owned();

    let unordered_list_regex = Regex::new(r"(?is)<ul[^>]*>(.*?)</ul>").expect("valid regex");
    sanitized = unordered_list_regex
        .replace_all(&sanitized, |caps: &regex::Captures| {
            render_list(&caps[1], ListKind::Unordered)
        })
        .into_owned();

    let ordered_list_regex = Regex::new(r"(?is)<ol[^>]*>(.*?)</ol>").expect("valid regex");
    sanitized = ordered_list_regex
        .replace_all(&sanitized, |caps: &regex::Captures| {
            render_list(&caps[1], ListKind::Ordered)
        })
        .into_owned();

    sanitized.trim().to_string()
}

#[cfg(target_os = "macos")]
fn parse_applescript_list(output: &str) -> Vec<String> {
    let trimmed = output.trim();
    let mut result = Vec::new();

    if trimmed.is_empty() {
        return result;
    }

    let content = trimmed.trim_start_matches('{').trim_end_matches('}').trim();

    if content.is_empty() {
        return result;
    }

    for part in content.split(',') {
        let cleaned = part.trim().trim_matches('"').trim().to_string();
        if !cleaned.is_empty() {
            result.push(cleaned);
        }
    }

    result
}

#[cfg(not(target_os = "macos"))]
fn parse_applescript_list(_output: &str) -> Vec<String> {
    Vec::new()
}

#[derive(Clone, Copy)]
enum ListKind {
    Unordered,
    Ordered,
}

fn render_list(inner: &str, kind: ListKind) -> String {
    let item_regex = Regex::new(r"(?is)<li[^>]*>(.*?)</li>").expect("valid regex");
    let mut rendered = String::new();
    for (index, caps) in item_regex.captures_iter(inner).enumerate() {
        let fragment = caps.get(1).map(|m| m.as_str()).unwrap_or("");
        let line = render_list_item(fragment, kind, index + 1);
        if !line.is_empty() {
            rendered.push_str(&line);
        }
    }
    rendered
}

fn render_list_item(raw: &str, kind: ListKind, index: usize) -> String {
    let truncated = match raw.find("<ul") {
        Some(pos) => &raw[..pos],
        None => raw,
    };

    let tag_regex = Regex::new(r"(?is)<[^>]+>").expect("valid regex");
    let text = tag_regex
        .replace_all(truncated, "")
        .trim()
        .replace('\n', " ")
        .trim()
        .to_string();

    if text.is_empty() {
        return String::new();
    }

    match kind {
        ListKind::Unordered => format!("<div>• {}</div>", text),
        ListKind::Ordered => format!("<div>{}. {}</div>", index, text),
    }
}

fn strip_leading_matching_heading(html: &str, title: &str) -> String {
    let heading_regex = Regex::new(r"(?is)^\s*<h1[^>]*>(.*?)</h1>").expect("valid regex");

    if let Some(caps) = heading_regex.captures(html) {
        let heading_text = caps.get(1).map(|m| m.as_str().trim()).unwrap_or("");

        if heading_text.eq_ignore_ascii_case(title.trim()) {
            return heading_regex.replace(html, "").to_string();
        }
    }

    html.to_string()
}

#[cfg(target_os = "macos")]
fn build_update_script(title: &str, folder: &str, body_html: &str) -> String {
    let title_literal = applescript_string_literal(title);
    let folder_literal = applescript_string_literal(folder);
    let body_literal = applescript_string_literal(body_html);

    format!(
        r#"
try
    set noteName to {title}
    set noteHTML to {body}
    set targetFolderName to {folder}

    tell application "Notes"
        if it is not running then launch
        set targetAccount to default account
        set targetFolders to every folder of targetAccount whose name is targetFolderName
        if targetFolders is {{}} then
            error "Apple Notes folder not found"
        end if

        set targetFolder to item 1 of targetFolders
        set notesByName to every note of targetFolder whose name is noteName

        if notesByName is {{}} then
            make new note at end of notes of targetFolder with properties {{name:noteName, body:noteHTML}}
        else
            set theNote to item 1 of notesByName
            set body of theNote to noteHTML
        end if
    end tell
on error errMsg number errNum
    error errMsg number errNum
end try
"#,
        title = title_literal,
        body = body_literal,
        folder = folder_literal,
    )
}

#[cfg(target_os = "macos")]
fn applescript_string_literal(input: &str) -> String {
    let normalized = input.replace("\r\n", "\n").replace('\r', "\n");
    let escaped = normalized.replace('\\', "\\\\").replace('"', "\\\"");

    if !escaped.contains('\n') {
        return format!("\"{}\"", escaped);
    }

    escaped
        .split('\n')
        .map(|part| format!("\"{}\"", part))
        .collect::<Vec<_>>()
        .join(" & return & ")
}

#[cfg(not(target_os = "macos"))]
fn build_update_script(title: &str, folder: &str, body_html: &str) -> String {
    format!(
        "{{title: {}, folder: {}, body: {}}}",
        title, folder, body_html
    )
}

#[cfg(not(target_os = "macos"))]
fn applescript_string_literal(input: &str) -> String {
    format!("\"{}\"", input)
}

#[cfg(test)]
mod tests {
    use super::sanitize_html_for_notes;
    use crate::services::sample::SAMPLE_NOTE_HTML;

    #[test]
    fn removes_nested_tasks() {
        let html = r#"<ul data-type=\"taskList\"><li data-type=\"taskItem\"><label><input type=\"checkbox\" /></label><div class=\"content\">Parent<ul><li>Nested</li></ul></div></li></ul>"#;
        let sanitized = sanitize_html_for_notes(html);

        assert!(!sanitized.contains("input"));
        assert!(!sanitized.contains("label"));
        assert!(!sanitized.contains("Nested"));
        assert!(sanitized.contains("Parent"));
    }

    #[test]
    fn render_list_item_removes_nested_content() {
        let raw = "<label><input type=\"checkbox\" /></label><div class=\"content\">Parent<ul><li>Nested</li></ul></div>";
        let rendered = super::render_list_item(raw, super::ListKind::Unordered, 1);
        assert_eq!(rendered, "<div>• Parent</div>");
    }

    #[test]
    fn preserves_standard_list_items() {
        let html = r#"
            <h2>Features</h2>
            <ul>
                <li><p>Auto-save - your notes are saved instantly</p></li>
                <li><p>Rich formatting - bold, italic, lists, headings, and more</p></li>
                <li><p>Drag to reposition, resize from edges</p></li>
            </ul>
            <p><em>Delete this text and start writing your notes!</em></p>
        "#;

        let sanitized = sanitize_html_for_notes(html);
        assert!(sanitized.contains("Auto-save"));
        assert!(sanitized.contains("Rich formatting"));
        assert!(sanitized.contains("Drag to reposition"));
        assert!(sanitized.contains("•"));
    }

    #[test]
    fn sample_state_preserved() {
        let sanitized = sanitize_html_for_notes(SAMPLE_NOTE_HTML);
        assert!(sanitized.contains("Auto-save - your notes are saved instantly"));
        assert!(sanitized.contains("Rich formatting - bold, italic, lists, headings, and more"));
        assert!(sanitized.contains("Drag to reposition, resize from edges"));
        assert!(sanitized.contains("Click away to hide (customizable in settings)"));
        assert!(sanitized.contains("Adjustable text size in preferences"));
        assert!(sanitized.contains("Delete this text and start writing your notes!"));
    }
}
