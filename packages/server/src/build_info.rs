pub fn server_version() -> &'static str {
    env!("CARGO_PKG_VERSION")
}

pub fn git_commit_hash() -> &'static str {
    option_env!("APPS_GIT_COMMIT").unwrap_or("unknown")
}

pub fn build_time() -> &'static str {
    option_env!("APPS_BUILD_TIME").unwrap_or("unknown")
}

pub fn rustc_version() -> &'static str {
    option_env!("RUSTC_VERSION").unwrap_or(env!("CARGO_PKG_VERSION"))
}

pub fn startup_banner() -> String {
    let logo: &[&str] = &[
        " ███████ ██    ██ ██      ██      ███████ ████████  █████   ██████ ██   ██    ██████  ███████",
        " ██      ██    ██ ██      ██      ██         ██    ██   ██ ██      ██  ██     ██   ██ ██     ",
        " █████   ██    ██ ██      ██      ███████    ██    ███████ ██      █████      ██████  ███████",
        " ██      ██    ██ ██      ██           ██    ██    ██   ██ ██      ██  ██     ██   ██      ██",
        " ██       ██████  ███████ ███████ ███████    ██    ██   ██  ██████ ██   ██ ██ ██   ██ ███████",
    ];

    // Diagonal gradient: amber-400 (#fbbf24) → red-500 (#ef4444)
    let from: [f64; 3] = [251.0, 191.0, 36.0];
    let to: [f64; 3] = [239.0, 68.0, 68.0];

    let width = logo.iter().map(|l| l.chars().count()).max().unwrap_or(1);
    let height = logo.len();
    let max_diag = (width - 1 + height - 1).max(1) as f64;

    let mut out = String::with_capacity(4096);
    out.push('\n');

    for (y, line) in logo.iter().enumerate() {
        out.push_str("  ");
        for (x, ch) in line.chars().enumerate() {
            if ch == ' ' {
                out.push(' ');
                continue;
            }
            let t = (x + y) as f64 / max_diag;
            let r = (from[0] + (to[0] - from[0]) * t) as u8;
            let g = (from[1] + (to[1] - from[1]) * t) as u8;
            let b = (from[2] + (to[2] - from[2]) * t) as u8;
            out.push_str("\x1b[38;2;");
            out.push_str(&r.to_string());
            out.push(';');
            out.push_str(&g.to_string());
            out.push(';');
            out.push_str(&b.to_string());
            out.push('m');
            out.push(ch);
        }
        out.push_str("\x1b[0m\n");
    }

    out.push_str(&format!(
        "\n  \x1b[2mv{} · {} · built {}\x1b[0m\n",
        server_version(),
        git_commit_hash(),
        build_time(),
    ));

    out
}
