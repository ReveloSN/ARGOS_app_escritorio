use std::io::{BufRead, BufReader};
use std::path::PathBuf;
use std::process::{Child, ChildStdin, ChildStdout, Command, Stdio};
use std::sync::mpsc;
use std::thread;
use std::time::Duration;

use serde::Deserialize;

const TOKEN_ENV_VAR: &str = "ARGUS_ENGINE_TOKEN";
const READY_EVENT: &str = "ready";
const LOOPBACK_HOST: &str = "127.0.0.1";
// La primera ejecución de `uv run` puede instalar dependencias antes de arrancar.
const READY_TIMEOUT: Duration = Duration::from_secs(120);

#[derive(Deserialize)]
struct EngineAnnouncement {
    event: String,
    port: u16,
}

#[derive(Debug)]
pub enum EngineLaunchError {
    TokenGeneration(getrandom::Error),
    Spawn(std::io::Error),
    MissingStdout,
    ExitedBeforeReady,
    ReadyTimeout,
}

impl std::fmt::Display for EngineLaunchError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::TokenGeneration(error) => write!(formatter, "sin fuente aleatoria: {error}"),
            Self::Spawn(error) => write!(formatter, "no se pudo lanzar el motor: {error}"),
            Self::MissingStdout => write!(formatter, "el motor no expuso su salida"),
            Self::ExitedBeforeReady => write!(formatter, "el motor se cerró al arrancar"),
            Self::ReadyTimeout => write!(formatter, "el motor no anunció su puerto a tiempo"),
        }
    }
}

impl From<getrandom::Error> for EngineLaunchError {
    fn from(error: getrandom::Error) -> Self {
        Self::TokenGeneration(error)
    }
}

pub struct EngineProcess {
    process: Child,
    stdin: Option<ChildStdin>,
    port: u16,
}

impl EngineProcess {
    fn new(mut process: Child, port: u16) -> Self {
        let stdin = process.stdin.take();
        Self {
            process,
            stdin,
            port,
        }
    }

    pub fn base_url(&self) -> String {
        format!("http://{LOOPBACK_HOST}:{}", self.port)
    }

    /// Cerrar stdin le indica al motor que termine (`--exit-on-stdin-close`); matar el proceso
    /// lanzador cubre el caso de que no responda.
    pub fn stop(mut self) {
        drop(self.stdin.take());
        let _ = self.process.kill();
        let _ = self.process.wait();
    }
}

pub fn launch_engine(token: &str) -> Result<EngineProcess, EngineLaunchError> {
    let mut child = development_engine_command()
        .env(TOKEN_ENV_VAR, token)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::inherit())
        .spawn()
        .map_err(EngineLaunchError::Spawn)?;
    let stdout = child
        .stdout
        .take()
        .ok_or(EngineLaunchError::MissingStdout)?;
    match wait_for_ready_port(stdout) {
        Ok(port) => Ok(EngineProcess::new(child, port)),
        Err(error) => {
            let _ = child.kill();
            let _ = child.wait();
            Err(error)
        }
    }
}

fn wait_for_ready_port(stdout: ChildStdout) -> Result<u16, EngineLaunchError> {
    let (sender, receiver) = mpsc::channel();
    thread::spawn(move || {
        let mut lines = BufReader::new(stdout).lines().map_while(Result::ok);
        let ready_port = lines.by_ref().find_map(|line| parse_ready_port(&line));
        let _ = sender.send(ready_port);
        // Seguir leyendo evita que el motor se bloquee al escribir en una tubería llena.
        for line in lines {
            log::info!(target: "argus_engine", "{line}");
        }
    });
    match receiver.recv_timeout(READY_TIMEOUT) {
        Ok(Some(port)) => Ok(port),
        Ok(None) => Err(EngineLaunchError::ExitedBeforeReady),
        Err(_) => Err(EngineLaunchError::ReadyTimeout),
    }
}

fn parse_ready_port(line: &str) -> Option<u16> {
    serde_json::from_str::<EngineAnnouncement>(line)
        .ok()
        .filter(|announcement| announcement.event == READY_EVENT)
        .map(|announcement| announcement.port)
}

/// En desarrollo el motor se ejecuta con uv desde el repositorio; el sidecar empaquetado con
/// PyInstaller lo reemplaza en la Fase 8 (ADR 008).
fn development_engine_command() -> Command {
    let engine_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("..")
        .join("..")
        .join("engine");
    let mut command = Command::new("uv");
    command.args(["run", "--project"]).arg(engine_dir).args([
        "python",
        "-m",
        "argus",
        "--exit-on-stdin-close",
    ]);
    hide_console_window(&mut command);
    command
}

#[cfg(windows)]
fn hide_console_window(command: &mut Command) {
    use std::os::windows::process::CommandExt;

    const CREATE_NO_WINDOW: u32 = 0x0800_0000;
    command.creation_flags(CREATE_NO_WINDOW);
}

#[cfg(not(windows))]
fn hide_console_window(_command: &mut Command) {}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ready_announcement_yields_the_port() {
        let port = parse_ready_port(r#"{"event": "ready", "port": 51234}"#);

        assert_eq!(port, Some(51234));
    }

    #[test]
    fn other_events_are_ignored() {
        let port = parse_ready_port(r#"{"event": "progress", "port": 1}"#);

        assert_eq!(port, None);
    }

    #[test]
    fn plain_log_lines_are_ignored() {
        assert_eq!(parse_ready_port("Uvicorn running"), None);
    }
}
