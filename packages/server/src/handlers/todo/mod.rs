use std::sync::Arc;

use axum::extract::{Path, State};
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde::Serialize;

use crate::db::entities::todos;
use crate::db::repos::todo_repo::TodoRepo;
use crate::db::repos::workspace_repo::WorkspaceRepo;
use crate::error::{ApiResponse, AppError};
use crate::handlers::auth::AuthUser;
use crate::AppState;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TodoOutput {
    pub id: String,
    pub workspace_id: String,
    pub title: String,
    pub category: String,
    pub completed: bool,
    pub created_by: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

impl From<todos::Model> for TodoOutput {
    fn from(t: todos::Model) -> Self {
        Self {
            id: t.id.to_string(),
            workspace_id: t.workspace_id.to_string(),
            title: t.title,
            category: t.category,
            completed: t.completed,
            created_by: t.created_by.map(|id| id.to_string()),
            created_at: t
                .created_at
                .map(|dt| dt.to_rfc3339())
                .unwrap_or_default(),
            updated_at: t
                .updated_at
                .map(|dt| dt.to_rfc3339())
                .unwrap_or_default(),
        }
    }
}

pub async fn list_todos(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Path(workspace_id): Path<String>,
) -> Response {
    let is_member = match WorkspaceRepo::is_member(&state.db, &workspace_id, &auth_user.user_id)
        .await
    {
        Ok(b) => b,
        Err(e) => return e.into_response(),
    };
    if !is_member {
        return AppError::Forbidden("Not a member of this workspace".into()).into_response();
    }

    let todos = match TodoRepo::list_by_workspace(&state.db, &workspace_id).await {
        Ok(t) => t,
        Err(e) => return e.into_response(),
    };

    let output: Vec<TodoOutput> = todos.into_iter().map(TodoOutput::from).collect();
    Json(ApiResponse {
        success: true,
        data: Some(output),
        error: None,
    })
    .into_response()
}

#[derive(serde::Deserialize)]
pub struct CreateTodoInput {
    pub title: String,
    pub category: Option<String>,
}

pub async fn create_todo(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Path(workspace_id): Path<String>,
    Json(body): Json<CreateTodoInput>,
) -> Response {
    let is_member = match WorkspaceRepo::is_member(&state.db, &workspace_id, &auth_user.user_id)
        .await
    {
        Ok(b) => b,
        Err(e) => return e.into_response(),
    };
    if !is_member {
        return AppError::Forbidden("Not a member of this workspace".into()).into_response();
    }

    let todo = match TodoRepo::create(
        &state.db,
        &workspace_id,
        &body.title,
        body.category.as_deref(),
        &auth_user.user_id,
    )
    .await
    {
        Ok(t) => t,
        Err(e) => return e.into_response(),
    };

    Json(ApiResponse {
        success: true,
        data: Some(TodoOutput::from(todo)),
        error: None,
    })
    .into_response()
}

#[derive(serde::Deserialize)]
pub struct UpdateTodoInput {
    pub title: Option<String>,
    pub category: Option<String>,
    pub completed: Option<bool>,
}

pub async fn update_todo(
    State(state): State<Arc<AppState>>,
    _auth_user: AuthUser,
    Path(id): Path<String>,
    Json(body): Json<UpdateTodoInput>,
) -> Response {
    let todo = match TodoRepo::update(&state.db, &id, body.title, body.category, body.completed)
        .await
    {
        Ok(t) => t,
        Err(e) => return e.into_response(),
    };

    Json(ApiResponse {
        success: true,
        data: Some(TodoOutput::from(todo)),
        error: None,
    })
    .into_response()
}

pub async fn delete_todo(
    State(state): State<Arc<AppState>>,
    _auth_user: AuthUser,
    Path(id): Path<String>,
) -> Response {
    if let Err(e) = TodoRepo::delete(&state.db, &id).await {
        return e.into_response();
    }

    Json(ApiResponse {
        success: true,
        data: Some(serde_json::json!({ "id": id })),
        error: None,
    })
    .into_response()
}
