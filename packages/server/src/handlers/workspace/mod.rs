use std::sync::Arc;

use axum::extract::State;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde::Serialize;

use crate::db::entities::workspaces;
use crate::db::repos::workspace_repo::{WorkspaceRepo, SYSTEM_SHARED_SLUG};
use crate::error::{ApiResponse, AppError};
use crate::handlers::auth::AuthUser;
use crate::AppState;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceOutput {
    pub id: String,
    pub slug: String,
    pub name: String,
    pub description: Option<String>,
    pub owner_id: Option<String>,
    pub created_at: String,
}

impl From<workspaces::Model> for WorkspaceOutput {
    fn from(w: workspaces::Model) -> Self {
        Self {
            id: w.id.to_string(),
            slug: w.slug,
            name: w.name,
            description: w.description,
            owner_id: w.owner_id.map(|id| id.to_string()),
            created_at: w
                .created_at
                .map(|dt| dt.to_rfc3339())
                .unwrap_or_default(),
        }
    }
}

fn slugify(value: &str) -> String {
    let s: String = value
        .to_lowercase()
        .trim()
        .chars()
        .map(|c| if c.is_alphanumeric() { c } else { '-' })
        .collect();
    s.trim_matches('-').to_string()
}

pub async fn list_workspaces(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
) -> Response {
    // In single workspace mode, ensure user has access to the shared workspace
    {
        use crate::db::entities::system_settings;
        use crate::handlers::auth::settings::resolve_single_workspace_mode;
        use sea_orm::EntityTrait;

        let row = system_settings::Entity::find()
            .one(&state.db)
            .await
            .ok()
            .flatten();
        let db_value = row.is_some_and(|s| s.single_workspace_mode);
        let (effective, _) = resolve_single_workspace_mode(db_value);

        if effective {
            // Auto-provision: ensure shared workspace exists and user is a member
            match WorkspaceRepo::get_or_create_shared(&state.db, &auth_user.user_id).await {
                Ok(shared_ws) => {
                    let _ = WorkspaceRepo::add_member(
                        &state.db,
                        &shared_ws.id.to_string(),
                        &auth_user.user_id,
                        "member",
                    )
                    .await;
                }
                Err(e) => return e.into_response(),
            }
        }
    }

    let workspaces = match WorkspaceRepo::list_by_user(&state.db, &auth_user.user_id).await {
        Ok(ws) => ws,
        Err(e) => return e.into_response(),
    };

    let output: Vec<WorkspaceOutput> = workspaces.into_iter().map(WorkspaceOutput::from).collect();

    Json(ApiResponse {
        success: true,
        data: Some(output),
        error: None,
    })
    .into_response()
}

#[derive(serde::Deserialize)]
pub struct CreateWorkspaceInput {
    pub name: String,
    pub slug: Option<String>,
}

pub async fn create_workspace(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Json(body): Json<CreateWorkspaceInput>,
) -> Response {
    // Block workspace creation in single workspace mode
    {
        use crate::db::entities::system_settings;
        use crate::handlers::auth::settings::resolve_single_workspace_mode;
        use sea_orm::EntityTrait;

        let row = system_settings::Entity::find()
            .one(&state.db)
            .await
            .ok()
            .flatten();
        let db_value = row.is_some_and(|s| s.single_workspace_mode);
        let (effective, _) = resolve_single_workspace_mode(db_value);
        if effective {
            return AppError::BadRequest(
                "Cannot create workspaces in single workspace mode".into(),
            )
            .into_response();
        }
    }

    let slug = body.slug.unwrap_or_else(|| {
        body.name
            .to_lowercase()
            .replace(' ', "-")
            .chars()
            .filter(|c| c.is_alphanumeric() || *c == '-')
            .collect()
    });

    let ws = match WorkspaceRepo::create_with_owner(
        &state.db,
        &body.name,
        &slug,
        &auth_user.user_id,
    )
    .await
    {
        Ok(ws) => ws,
        Err(e) => {
            if e.to_string().contains("duplicate") || e.to_string().contains("unique") {
                return AppError::Conflict("workspace slug already exists".into()).into_response();
            }
            return e.into_response();
        }
    };

    Json(ApiResponse {
        success: true,
        data: Some(WorkspaceOutput::from(ws)),
        error: None,
    })
    .into_response()
}

pub async fn get_workspace_by_slug(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    axum::extract::Path(slug): axum::extract::Path<String>,
) -> Response {
    let workspace = match WorkspaceRepo::find_by_slug(&state.db, &slug).await {
        Ok(Some(ws)) => ws,
        Ok(None) => return AppError::NotFound("Workspace not found".into()).into_response(),
        Err(e) => return e.into_response(),
    };

    let ws_id_str = workspace.id.to_string();
    let is_member = match WorkspaceRepo::is_member(&state.db, &ws_id_str, &auth_user.user_id)
        .await
    {
        Ok(b) => b,
        Err(e) => return e.into_response(),
    };
    if !is_member {
        return AppError::NotFound("Workspace not found".into()).into_response();
    }

    Json(ApiResponse {
        success: true,
        data: Some(WorkspaceOutput::from(workspace)),
        error: None,
    })
    .into_response()
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateWorkspaceInput {
    pub name: Option<String>,
    pub slug: Option<String>,
    pub description: Option<String>,
}

pub async fn update_workspace(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    axum::extract::Path(workspace_id): axum::extract::Path<String>,
    Json(body): Json<UpdateWorkspaceInput>,
) -> Response {
    let workspace = match WorkspaceRepo::find_by_id(&state.db, &workspace_id).await {
        Ok(Some(ws)) => ws,
        Ok(None) => return AppError::NotFound("Workspace not found".into()).into_response(),
        Err(e) => return e.into_response(),
    };

    if workspace.owner_id.map(|id| id.to_string()).as_deref() != Some(&auth_user.user_id) {
        return AppError::Forbidden("Only workspace owner can update".into()).into_response();
    }

    // If slug is being changed, validate it
    if let Some(ref new_slug) = body.slug {
        let slug = slugify(new_slug);
        if slug == SYSTEM_SHARED_SLUG {
            return AppError::BadRequest("Reserved workspace slug".into()).into_response();
        }
        // Check uniqueness
        if let Ok(Some(existing)) = WorkspaceRepo::find_by_slug(&state.db, &slug).await
            && existing.id != workspace.id
        {
            return AppError::Conflict("Workspace slug already exists".into()).into_response();
        }
    }

    let updated = match WorkspaceRepo::update(
        &state.db,
        &workspace_id,
        body.name,
        body.slug.map(|s| slugify(&s)),
        body.description,
    )
    .await
    {
        Ok(ws) => ws,
        Err(e) => return e.into_response(),
    };

    Json(ApiResponse {
        success: true,
        data: Some(WorkspaceOutput::from(updated)),
        error: None,
    })
    .into_response()
}

pub async fn delete_workspace(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    axum::extract::Path(workspace_id): axum::extract::Path<String>,
) -> Response {
    let workspace = match WorkspaceRepo::find_by_id(&state.db, &workspace_id).await {
        Ok(Some(ws)) => ws,
        Ok(None) => return AppError::NotFound("Workspace not found".into()).into_response(),
        Err(e) => return e.into_response(),
    };

    if workspace.owner_id.map(|id| id.to_string()).as_deref() != Some(&auth_user.user_id) {
        return AppError::Forbidden("Only workspace owner can delete".into()).into_response();
    }

    if let Err(e) = WorkspaceRepo::delete(&state.db, &workspace_id).await {
        return e.into_response();
    }

    Json(ApiResponse {
        success: true,
        data: Some(serde_json::json!({ "id": workspace_id })),
        error: None,
    })
    .into_response()
}
