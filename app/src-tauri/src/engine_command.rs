use std::env::consts::EXE_SUFFIX;
use std::path::{Path, PathBuf};
use std::process::Command;

const EXIT_ON_STDIN_CLOSE: &str = "--exit-on-stdin-close";
// Carpetas que tauri.bundle.conf.json copia dentro de los recursos del instalador (ADR 017).
const BUNDLED_ENGINE_FOLDER: &str = "engine";
const BUNDLED_MODELS_FOLDER: &str = "models";
const ENGINE_EXECUTABLE: &str = "argus-engine";
const MODELS_ENV_VAR: &str = "ARGUS_MODELS_DIR";

/// Dónde está el motor: el repositorio en desarrollo o la carpeta empaquetada en la instalación.
pub enum EngineLocation {
    Repository,
    Bundled(PathBuf),
}

impl EngineLocation {
    pub fn command(&self) -> Command {
        let mut command = match self {
            Self::Repository => repository_command(),
            Self::Bundled(resources) => bundled_command(resources),
        };
        hide_console_window(&mut command);
        command
    }
}

/// En desarrollo el motor se ejecuta con uv desde el repositorio, sin empaquetar.
fn repository_command() -> Command {
    let engine_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("..")
        .join("..")
        .join("engine");
    let mut command = Command::new("uv");
    command.args(["run", "--project"]).arg(engine_dir).args([
        "python",
        "-m",
        "argus",
        EXIT_ON_STDIN_CLOSE,
    ]);
    command
}

/// El ejecutable de PyInstaller con los modelos de embeddings que el instalador copia aparte.
fn bundled_command(resources: &Path) -> Command {
    let executable = resources
        .join(BUNDLED_ENGINE_FOLDER)
        .join(format!("{ENGINE_EXECUTABLE}{EXE_SUFFIX}"));
    let mut command = Command::new(executable);
    command
        .arg(EXIT_ON_STDIN_CLOSE)
        .env(MODELS_ENV_VAR, resources.join(BUNDLED_MODELS_FOLDER));
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
    use std::ffi::OsStr;

    use super::*;

    #[test]
    fn development_runs_the_engine_from_the_repository_with_uv() {
        let command = EngineLocation::Repository.command();

        assert_eq!(command.get_program(), "uv");
        assert!(command.get_args().any(|arg| arg == EXIT_ON_STDIN_CLOSE));
    }

    #[test]
    fn an_installation_runs_the_bundled_engine_with_its_models() {
        let resources = PathBuf::from("recursos");

        let command = EngineLocation::Bundled(resources.clone()).command();

        let executable = resources
            .join("engine")
            .join(format!("argus-engine{EXE_SUFFIX}"));
        assert_eq!(command.get_program(), executable.as_os_str());
        let models = command
            .get_envs()
            .find(|(name, _)| *name == OsStr::new(MODELS_ENV_VAR))
            .and_then(|(_, value)| value);
        assert_eq!(models, Some(resources.join("models").as_os_str()));
    }
}
