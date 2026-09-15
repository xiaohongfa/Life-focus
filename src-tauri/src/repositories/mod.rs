pub(crate) fn custom_err(msg: impl Into<String>) -> rusqlite::Error {
    rusqlite::Error::ToSqlConversionFailure(Box::new(std::io::Error::other(msg.into())))
}

pub struct Repository;

mod archive;
mod export;
mod focus;
mod ideology;
mod life;
mod spirit;
mod stability;
mod staff;
mod traits;
