use wasm_bindgen::prelude::*;

#[wasm_bindgen(js_name = "wasmVersion")]
pub fn wasm_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[wasm_bindgen(js_name = "wasmGitCommit")]
pub fn wasm_git_commit() -> String {
    option_env!("ACME_GIT_COMMIT")
        .unwrap_or("unknown")
        .to_string()
}

#[wasm_bindgen(js_name = "wasmBuildTime")]
pub fn wasm_build_time() -> String {
    option_env!("ACME_BUILD_TIME")
        .unwrap_or("unknown")
        .to_string()
}
