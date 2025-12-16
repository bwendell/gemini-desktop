//! Gemini Proxy Protocol
//!
//! This module registers a custom URI scheme protocol that proxies requests
//! to gemini.google.com, stripping X-Frame-Options and CSP frame-ancestors
//! headers to allow embedding in an iframe.
//!
//! Usage in frontend: `<iframe src="gemini-proxy://gemini.google.com/app" />`

use http::header::{HeaderValue, CONTENT_TYPE};
use log::{debug, error, info};
use std::borrow::Cow;
use tauri::http::{Request, Response};

/// Headers to strip from proxied responses to allow iframe embedding.
const HEADERS_TO_STRIP: &[&str] = &[
    "x-frame-options",
    "content-security-policy",
    "x-content-type-options",
];

/// Base URL for Gemini
const GEMINI_BASE_URL: &str = "https://gemini.google.com";

/// Handles requests to the gemini-proxy:// protocol.
///
/// Fetches the requested resource from gemini.google.com, strips security
/// headers that prevent iframe embedding, and returns the modified response.
#[cfg(not(tarpaulin_include))]
pub fn handle_proxy_request(request: Request<Vec<u8>>) -> Response<Cow<'static, [u8]>> {
    let uri = request.uri();
    info!("[GeminiProxy] Received request: {}", uri);

    let path = uri.path();
    let query = uri.query().map(|q| format!("?{}", q)).unwrap_or_default();

    // Construct the target URL
    let target_url = format!("{}{}{}", GEMINI_BASE_URL, path, query);
    info!("[GeminiProxy] Proxying request to: {}", target_url);

    // Make the HTTP request
    let client: reqwest::blocking::Client = match reqwest::blocking::Client::builder()
        .cookie_store(true)
        .build()
    {
        Ok(c) => c,
        Err(e) => {
            error!("[GeminiProxy] Failed to create HTTP client: {}", e);
            return error_response(500, "Internal proxy error");
        }
    };

    let response: reqwest::blocking::Response = match client.get(&target_url).send() {
        Ok(r) => r,
        Err(e) => {
            error!("[GeminiProxy] Request failed: {}", e);
            return error_response(502, "Failed to fetch from Gemini");
        }
    };

    let status = response.status().as_u16();
    let content_type = response
        .headers()
        .get("content-type")
        .and_then(|v: &reqwest::header::HeaderValue| v.to_str().ok())
        .unwrap_or("text/html")
        .to_string();

    // Get body
    let body: Vec<u8> = match response.bytes() {
        Ok(b) => b.to_vec(),
        Err(e) => {
            error!("[GeminiProxy] Failed to read response body: {}", e);
            return error_response(500, "Failed to read response");
        }
    };

    info!(
        "[GeminiProxy] Successfully proxied {} ({} bytes)",
        target_url,
        body.len()
    );

    // Build response with stripped headers
    let builder = Response::builder()
        .status(status)
        .header(CONTENT_TYPE, content_type);

    // We intentionally do NOT copy X-Frame-Options or CSP headers
    // This allows the content to be embedded in an iframe

    builder
        .body(Cow::Owned(body))
        .unwrap_or_else(|_| error_response(500, "Response build error"))
}

/// Creates an error response.
fn error_response(status: u16, message: &str) -> Response<Cow<'static, [u8]>> {
    Response::builder()
        .status(status)
        .header(CONTENT_TYPE, HeaderValue::from_static("text/plain"))
        .body(Cow::Owned(message.as_bytes().to_vec()))
        .unwrap()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_headers_to_strip_includes_key_headers() {
        assert!(HEADERS_TO_STRIP.contains(&"x-frame-options"));
        assert!(HEADERS_TO_STRIP.contains(&"content-security-policy"));
    }

    #[test]
    fn test_gemini_base_url_is_https() {
        assert!(GEMINI_BASE_URL.starts_with("https://"));
    }
}
