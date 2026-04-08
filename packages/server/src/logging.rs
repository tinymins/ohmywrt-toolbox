//! 自定义日志格式化器 — 让 sqlx 查询日志简洁好看。

use std::fmt;

use tracing::field::{Field, Visit};
use tracing::{Event, Level, Subscriber};
use tracing_log::NormalizeEvent;
use tracing_subscriber::fmt::format::{FormatEvent, FormatFields, Writer};
use tracing_subscriber::fmt::FmtContext;
use tracing_subscriber::registry::LookupSpan;

/// 自定义事件格式化器：
/// - `sqlx::query` 事件：超过 10ms 才输出，显示完整 SQL + 来源位置
/// - 其他事件：紧凑的 时间 级别 模块 消息 格式
pub struct PrettyFormatter;

impl<S, N> FormatEvent<S, N> for PrettyFormatter
where
    S: Subscriber + for<'a> LookupSpan<'a>,
    N: for<'a> FormatFields<'a> + 'static,
{
    fn format_event(
        &self,
        ctx: &FmtContext<'_, S, N>,
        mut writer: Writer<'_>,
        event: &Event<'_>,
    ) -> fmt::Result {
        let normalized = event.normalized_metadata();
        let meta = normalized.as_ref().unwrap_or_else(|| event.metadata());
        let ansi = writer.has_ansi_escapes();

        if meta.target() == "sqlx::query" {
            // ── sqlx 查询：超过 10ms 才输出（先判断再写时间戳，避免输出孤立时间戳）──
            let mut v = SqlxVisitor::default();
            event.record(&mut v);

            if v.elapsed_secs < 0.01 {
                return Ok(());
            }

            // 时间戳（本地时间，dim）
            let now = chrono::Local::now();
            if ansi {
                write!(writer, "\x1b[2m{}\x1b[0m ", now.format("%H:%M:%S%.3f"))?;
            } else {
                write!(writer, "{} ", now.format("%H:%M:%S%.3f"))?;
            }

            let summary = v.summary.replace("\\\"", "").replace('"', "");

            let keyword = summary
                .split_whitespace()
                .next()
                .unwrap_or("")
                .to_uppercase();

            let table = extract_table_name(&keyword, &summary);

            // 第一行：关键字 + 表名 + 行数 + 耗时 + 来源
            if ansi {
                let kw_color = sql_keyword_color(&keyword);
                let elapsed_color = elapsed_secs_color(v.elapsed_secs);
                write!(writer, "  {kw_color}{keyword:<6}\x1b[0m ", )?;
                if let Some(t) = &table {
                    write!(writer, "\x1b[1;37m{t}\x1b[0m ")?;
                }
                write!(
                    writer,
                    "\x1b[36m{} row{}\x1b[0m {elapsed_color}{}\x1b[0m",
                    v.rows_returned,
                    if v.rows_returned == "1" { "" } else { "s" },
                    v.elapsed,
                )?;
            } else {
                write!(writer, "  {keyword:<6} ", )?;
                if let Some(t) = &table {
                    write!(writer, "{t} ")?;
                }
                write!(
                    writer,
                    "{} row{} {}",
                    v.rows_returned,
                    if v.rows_returned == "1" { "" } else { "s" },
                    v.elapsed,
                )?;
            }

            // 来源位置（从 tracing span 上下文提取，需要调用方加 #[tracing::instrument]）
            if let Some(scope) = ctx.event_scope() {
                for span in scope {
                    let span_meta = span.metadata();
                    let name = span.name();
                    if let (Some(file), Some(line)) = (span_meta.file(), span_meta.line()) {
                        let short = file.strip_prefix("src/").unwrap_or(file);
                        if ansi {
                            write!(writer, " \x1b[2m@ {name} ({short}:{line})\x1b[0m")?;
                        } else {
                            write!(writer, " @ {name} ({short}:{line})")?;
                        }
                        break;
                    }
                }
            }
            writeln!(writer)?;

            // 第二行：完整 SQL（缩进 + dim）
            if v.db_statement.is_empty() {
                Ok(())
            } else {
                let sql = v
                    .db_statement
                    .replace("\\\"", "\"")
                    .replace("\\n", " ");
                let sql_oneline: String = sql.split_whitespace().collect::<Vec<_>>().join(" ");
                if ansi {
                    writeln!(writer, "         \x1b[2m{sql_oneline}\x1b[0m")
                } else {
                    writeln!(writer, "         {sql_oneline}")
                }
            }
        } else {
            // ── 普通日志：时间戳 + 级别 + 模块 + 消息 ──
            let now = chrono::Local::now();
            if ansi {
                write!(writer, "\x1b[2m{}\x1b[0m ", now.format("%H:%M:%S%.3f"))?;
            } else {
                write!(writer, "{} ", now.format("%H:%M:%S%.3f"))?;
            }

            let level = *meta.level();
            if ansi {
                write!(writer, "{}{level:>5}\x1b[0m ", level_color(level))?;
            } else {
                write!(writer, "{level:>5} ", )?;
            }

            // 模块路径（dim）
            if ansi {
                write!(writer, "\x1b[2m{}\x1b[0m ", meta.target())?;
            } else {
                write!(writer, "{} ", meta.target())?;
            }

            // 文件行号（编译期静态元数据，零运行时开销）
            if let (Some(file), Some(line)) = (meta.file(), meta.line()) {
                let (path, color) = file_location(file);
                if ansi {
                    write!(writer, "{color}{path}:{line}\x1b[0m ")?;
                } else {
                    write!(writer, "{path}:{line} ")?;
                }
            }

            // 消息 + 字段
            ctx.format_fields(writer.by_ref(), event)?;
            writeln!(writer)
        }
    }
}

fn level_color(level: Level) -> &'static str {
    match level {
        Level::ERROR => "\x1b[1;31m", // bold red
        Level::WARN => "\x1b[1;33m",  // bold yellow
        Level::INFO => "\x1b[1;32m",  // bold green
        Level::DEBUG => "\x1b[1;34m", // bold blue
        Level::TRACE => "\x1b[35m",   // magenta
    }
}

/// 不同 SQL 命令用不同颜色
fn sql_keyword_color(keyword: &str) -> &'static str {
    match keyword {
        "SELECT" => "\x1b[1;36m", // bold cyan
        "INSERT" => "\x1b[1;32m", // bold green
        "UPDATE" => "\x1b[1;33m", // bold yellow
        "DELETE" => "\x1b[1;31m", // bold red
        _ => "\x1b[1;35m",        // bold magenta (CREATE, ALTER, etc.)
    }
}

/// 从 SQL summary 中推断主表名。
/// 规则：
///   SELECT ... FROM table.col  → 取 "table.col" 中 '.' 前面的部分
///   SELECT table.col ...       → 取首列前缀（子查询 SELECT COUNT(*) 等走这条）
///   INSERT INTO table ...      → INTO 后面的词
///   UPDATE table ...           → UPDATE 后面的词
///   DELETE FROM table ...      → FROM 后面的词
fn extract_table_name<'a>(keyword: &str, summary: &'a str) -> Option<&'a str> {
    let words: Vec<&str> = summary.split_whitespace().collect();

    match keyword {
        "INSERT" => {
            // INSERT INTO table_name ...
            let pos = words.iter().position(|w| w.eq_ignore_ascii_case("INTO"))?;
            let raw = words.get(pos + 1)?;
            Some(raw.split('.').next().unwrap_or(raw))
        }
        "UPDATE" => {
            // UPDATE table_name SET ...
            let raw = words.get(1)?;
            Some(raw.split('.').next().unwrap_or(raw))
        }
        "DELETE" => {
            // DELETE FROM table_name ...
            let pos = words.iter().position(|w| w.eq_ignore_ascii_case("FROM"))?;
            let raw = words.get(pos + 1)?;
            Some(raw.split('.').next().unwrap_or(raw))
        }
        "SELECT" => {
            // 尝试 FROM table.col
            if let Some(pos) = words.iter().position(|w| w.eq_ignore_ascii_case("FROM"))
                && let Some(raw) = words.get(pos + 1)
                && !raw.starts_with('(')
            {
                return Some(raw.split('.').next().unwrap_or(raw));
            }
            // 备选：SELECT table.col, ... → 取首列的表前缀
            let first_col = words.get(1)?;
            first_col.split('.').next().filter(|t| !t.contains('('))
        }
        _ => None,
    }
}

/// 耗时颜色：<10ms 绿色，10-100ms 黄色，>=100ms 红色
fn elapsed_secs_color(secs: f64) -> &'static str {
    if secs >= 0.1 {
        "\x1b[1;31m" // bold red
    } else if secs >= 0.01 {
        "\x1b[1;33m" // bold yellow
    } else {
        "\x1b[32m" // green
    }
}

/// 将编译期嵌入的文件路径转换为可读的短路径，并返回对应包的 ANSI 颜色。
///
/// - workspace 内包：`packages/rust-hls/src/manager.rs` → `("manager.rs", cyan)`
/// - ohmywrt-toolbox-server 自身：`src/handlers/media/hls.rs` → `("handlers/media/hls.rs", blue)`
/// - cargo registry：`/…/.cargo/registry/src/<hash>/reqwest-0.13.2/src/connect.rs` → `("connect.rs", dim)`
fn file_location(file: &str) -> (&str, &'static str) {
    const WS_ROOT: &str = env!("APPS_WORKSPACE_ROOT");

    if let Some(rel) = file.strip_prefix(WS_ROOT).map(|s| s.trim_start_matches('/')) {
        // workspace 路径（其他 crate 编译时嵌入绝对路径）
        if let Some(after_pkgs) = rel.strip_prefix("packages/")
            && let Some(slash) = after_pkgs.find('/')
        {
            let pkg = &after_pkgs[..slash];
            let rest = &after_pkgs[slash + 1..];
            // 去掉 src/ 前缀（只去顶层的）
            let rest = rest.strip_prefix("src/").unwrap_or(rest);
            return (rest, pkg_color(pkg));
        }
        return (rel, pkg_color("workspace"));
    }

    if let Some(i) = file.find("/.cargo/registry/src/") {
        // cargo registry 依赖，去掉 .cargo/registry/src/<index-hash>/<crate-ver>/src/
        let after = &file[i + "/.cargo/registry/src/".len()..];
        let without_index = after.find('/').map_or(after, |j| &after[j + 1..]);
        let in_crate = without_index.find('/').map_or(without_index, |j| &without_index[j + 1..]);
        let path = in_crate.strip_prefix("src/").unwrap_or(in_crate);
        return (path, "\x1b[2m"); // dim — 外部库不重要
    }

    // ohmywrt-toolbox-server 自身（相对路径，src/ 开头）
    let path = file.strip_prefix("src/").unwrap_or(file);
    (path, pkg_color("ohmywrt-toolbox-server"))
}

/// 根据包名确定性地映射到一个 ANSI 前景色，同一包名始终同色。
fn pkg_color(name: &str) -> &'static str {
    // 避免红色（ERROR 用）和绿色（INFO 用），其余颜色供内部包使用
    const PALETTE: &[&str] = &[
        "\x1b[36m",  // cyan
        "\x1b[33m",  // yellow
        "\x1b[35m",  // magenta
        "\x1b[34m",  // blue
        "\x1b[96m",  // bright cyan
        "\x1b[93m",  // bright yellow
        "\x1b[95m",  // bright magenta
        "\x1b[94m",  // bright blue
        "\x1b[37m",  // white
        "\x1b[91m",  // bright red
    ];
    let hash = name
        .bytes()
        .fold(5381usize, |h, b| h.wrapping_mul(33).wrapping_add(b as usize));
    PALETTE[hash % PALETTE.len()]
}
#[derive(Default)]
struct SqlxVisitor {
    summary: String,
    db_statement: String,
    elapsed: String,
    elapsed_secs: f64,
    rows_returned: String,
}

impl Visit for SqlxVisitor {
    fn record_debug(&mut self, field: &Field, value: &dyn fmt::Debug) {
        let s = format!("{value:?}");
        match field.name() {
            "summary" => self.summary = s.trim_matches('"').to_string(),
            "db.statement" => self.db_statement = s.trim_matches('"').to_string(),
            "elapsed" => self.elapsed = s.trim_matches('"').to_string(),
            "elapsed_secs" => self.elapsed_secs = s.parse().unwrap_or(0.0),
            "rows_returned" => self.rows_returned = s,
            _ => {}
        }
    }
}
