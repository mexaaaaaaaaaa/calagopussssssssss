//! Calagopus Panel extension crate for `cloud.petalnodes.sanctuary`.
//!
//! This theme extension operates purely at the frontend Mantine/Tailwind layer
//! via `frontend/src/index.tsx` and `frontend/src/app.css`,
//! preserving all native Calagopus backend routes, permissions, and business logic.

use shared::{State, extensions::Extension};

pub const EXTENSION_ID: &str = "cloud.petalnodes.sanctuary";
pub const EXTENSION_VERSION: &str = env!("CARGO_PKG_VERSION");

#[derive(Default)]
pub struct ExtensionStruct;

#[async_trait::async_trait]
impl Extension for ExtensionStruct {
    async fn initialize(&mut self, _state: State) {
        tracing::info!(
            "Petalnodes Sanctuary Theme ({} v{}) initialized",
            EXTENSION_ID,
            EXTENSION_VERSION
        );
    }
}
