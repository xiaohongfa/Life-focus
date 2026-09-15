pub mod archive;
pub mod export;
pub mod focus;
pub mod life;
pub mod stability;
pub mod staff;
pub mod traits;
pub mod world;

pub(crate) fn map_err<E: std::fmt::Display>(e: E) -> String {
    e.to_string()
}

pub use archive::*;
pub use export::*;
pub use focus::*;
pub use life::*;
pub use stability::*;
pub use staff::*;
pub use traits::*;
pub use world::*;
