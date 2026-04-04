use std::{
    env,
    path::PathBuf,
    process::Command,
};

fn main() {
    println!("cargo:rerun-if-changed=build.rs");
    println!("cargo:rerun-if-env-changed=RUSTC");

    if let Some(paths) = git_watch_paths() {
        for path in paths {
            println!("cargo:rerun-if-changed={}", path.display());
        }
    }

    let git_commit = git_stdout(["rev-parse", "--short=12", "HEAD"])
        .unwrap_or_else(|| "unknown".to_string());
    println!("cargo:rustc-env=ACME_GIT_COMMIT={git_commit}");

    let build_time = chrono_local_now().unwrap_or_else(|| "unknown".to_string());
    println!("cargo:rustc-env=ACME_BUILD_TIME={build_time}");
}

fn git_watch_paths() -> Option<Vec<PathBuf>> {
    let git_dir = resolve_git_dir()?;
    let mut paths = vec![git_dir.join("HEAD")];

    if let Some(head_ref) = current_head_ref(&git_dir) {
        paths.push(head_ref);
    }

    Some(paths)
}

fn resolve_git_dir() -> Option<PathBuf> {
    let manifest_dir = PathBuf::from(env::var_os("CARGO_MANIFEST_DIR")?);
    let git_dir = PathBuf::from(git_stdout(["rev-parse", "--git-dir"])?);

    Some(if git_dir.is_absolute() {
        git_dir
    } else {
        manifest_dir.join(git_dir)
    })
}

fn current_head_ref(git_dir: &std::path::Path) -> Option<PathBuf> {
    let head = std::fs::read_to_string(git_dir.join("HEAD")).ok()?;
    let ref_path = head.strip_prefix("ref: ")?.trim();
    Some(git_dir.join(ref_path))
}

fn git_stdout<const N: usize>(args: [&str; N]) -> Option<String> {
    let manifest_dir = env::var_os("CARGO_MANIFEST_DIR")?;
    let output = Command::new("git")
        .current_dir(manifest_dir)
        .args(args)
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    parse_stdout(output.stdout)
}

fn parse_stdout(stdout: Vec<u8>) -> Option<String> {
    let value = String::from_utf8(stdout).ok()?;
    let trimmed = value.trim();

    if trimmed.is_empty() {
        None
    } else {
        Some(trimmed.to_string())
    }
}

fn chrono_local_now() -> Option<String> {
    let output = Command::new("date")
        .arg("+%Y-%m-%d %H:%M:%S")
        .output()
        .ok()?;
    if !output.status.success() {
        return None;
    }
    parse_stdout(output.stdout)
}
