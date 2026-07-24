use serde::{Deserialize, Serialize};

const DIRECT_PROXY_URL_ENV: &str = "DIRECT_PROXY_URL";
const DIRECT_PROXY_USERNAME_ENV: &str = "DIRECT_PROXY_USERNAME";
const DIRECT_PROXY_PASSWORD_ENV: &str = "DIRECT_PROXY_PASSWORD";

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum SourceFetchMode {
    #[default]
    Auto,
    DomesticDirect,
}

impl SourceFetchMode {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Auto => "auto",
            Self::DomesticDirect => "domestic-direct",
        }
    }
}

pub struct SourceHttpClient {
    pub client: reqwest::Client,
    pub proxy_endpoint: Option<String>,
}

fn direct_proxy_config() -> Result<(reqwest::Url, Option<(String, String)>), String> {
    let raw_url = std::env::var(DIRECT_PROXY_URL_ENV)
        .map_err(|_| format!("{DIRECT_PROXY_URL_ENV} is not configured"))?;
    let url = reqwest::Url::parse(raw_url.trim())
        .map_err(|_| format!("{DIRECT_PROXY_URL_ENV} is not a valid URL"))?;
    if !matches!(url.scheme(), "http" | "https") || url.host_str().is_none() {
        return Err(format!(
            "{DIRECT_PROXY_URL_ENV} must be an HTTP or HTTPS proxy URL"
        ));
    }

    let username = std::env::var(DIRECT_PROXY_USERNAME_ENV).ok();
    let password = std::env::var(DIRECT_PROXY_PASSWORD_ENV).ok();
    let auth = match (username, password) {
        (Some(username), Some(password)) if !username.is_empty() && !password.is_empty() => {
            Some((username, password))
        }
        (None, None) => None,
        _ => {
            return Err(format!(
                "{DIRECT_PROXY_USERNAME_ENV} and {DIRECT_PROXY_PASSWORD_ENV} must be configured together"
            ));
        }
    };

    Ok((url, auth))
}

fn sanitized_endpoint(url: &reqwest::Url) -> String {
    let mut sanitized = url.clone();
    let _ = sanitized.set_username("");
    let _ = sanitized.set_password(None);
    sanitized.to_string().trim_end_matches('/').to_string()
}

pub fn proxy_endpoint(mode: SourceFetchMode) -> Result<Option<String>, String> {
    if mode == SourceFetchMode::Auto {
        return Ok(None);
    }
    let (url, _) = direct_proxy_config()?;
    Ok(Some(sanitized_endpoint(&url)))
}

pub fn build_source_http_client(
    mode: SourceFetchMode,
    tls_info: bool,
) -> Result<SourceHttpClient, String> {
    let mut builder = reqwest::Client::builder().timeout(std::time::Duration::from_secs(15));
    if tls_info {
        builder = builder.tls_info(true);
    }

    let proxy_endpoint = if mode == SourceFetchMode::DomesticDirect {
        let (url, auth) = direct_proxy_config()?;
        let endpoint = sanitized_endpoint(&url);
        let mut proxy = reqwest::Proxy::all(url)
            .map_err(|_| format!("{DIRECT_PROXY_URL_ENV} could not be configured"))?;
        if let Some((username, password)) = auth {
            proxy = proxy.basic_auth(&username, &password);
        }
        builder = builder.proxy(proxy);
        Some(endpoint)
    } else {
        None
    };

    let client = builder
        .build()
        .map_err(|error| format!("Failed to build subscription HTTP client: {error}"))?;

    Ok(SourceHttpClient {
        client,
        proxy_endpoint,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn source_fetch_mode_defaults_to_auto() {
        #[derive(Deserialize)]
        struct Input {
            #[serde(default)]
            mode: SourceFetchMode,
        }

        let input: Input = serde_json::from_str("{}").unwrap();
        assert_eq!(input.mode, SourceFetchMode::Auto);
        assert_eq!(
            serde_json::to_string(&SourceFetchMode::DomesticDirect).unwrap(),
            "\"domestic-direct\""
        );
    }

    #[test]
    fn sanitized_proxy_endpoint_removes_credentials() {
        let url = reqwest::Url::parse("http://user:secret@proxy.example.com:7890").unwrap();
        assert_eq!(sanitized_endpoint(&url), "http://proxy.example.com:7890");
    }
}
