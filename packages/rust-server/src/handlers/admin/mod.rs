use crate::db::entities::users::UserRole;
use crate::error::AppError;
use crate::handlers::auth::AuthUser;

pub mod invitations;
pub mod settings;
pub mod users;

/// Require the current user to be admin or superadmin.
pub fn require_admin(user: &AuthUser) -> Result<(), AppError> {
    match user.role {
        UserRole::Admin | UserRole::Superadmin => Ok(()),
        _ => Err(AppError::Forbidden("Admin privileges required".into())),
    }
}

/// Require the current user to be superadmin.
pub fn require_superadmin(user: &AuthUser) -> Result<(), AppError> {
    match user.role {
        UserRole::Superadmin => Ok(()),
        _ => Err(AppError::Forbidden(
            "Super admin privileges required".into(),
        )),
    }
}
