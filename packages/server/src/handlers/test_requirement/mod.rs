use std::sync::Arc;

use axum::extract::{Path, Query, State};
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde::Serialize;

use crate::db::entities::test_requirements;
use crate::db::repos::test_requirement_repo::TestRequirementRepo;
use crate::db::repos::workspace_repo::WorkspaceRepo;
use crate::error::{ApiResponse, AppError};
use crate::handlers::auth::AuthUser;
use crate::AppState;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TestRequirementOutput {
    pub id: String,
    pub workspace_id: String,
    pub code: String,
    pub title: String,
    pub description: Option<String>,
    pub content: Option<String>,
    pub r#type: String,
    pub status: String,
    pub priority: String,
    pub parent_id: Option<String>,
    pub tags: Option<serde_json::Value>,
    pub assignee_id: Option<String>,
    pub created_by: Option<String>,
    pub due_date: Option<String>,
    pub estimated_hours: Option<String>,
    pub actual_hours: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

impl From<test_requirements::Model> for TestRequirementOutput {
    fn from(r: test_requirements::Model) -> Self {
        Self {
            id: r.id.to_string(),
            workspace_id: r.workspace_id.to_string(),
            code: r.code,
            title: r.title,
            description: r.description,
            content: r.content,
            r#type: r.r#type,
            status: r.status,
            priority: r.priority,
            parent_id: r.parent_id.map(|id| id.to_string()),
            tags: r.tags,
            assignee_id: r.assignee_id.map(|id| id.to_string()),
            created_by: r.created_by.map(|id| id.to_string()),
            due_date: r.due_date.map(|dt| dt.to_rfc3339()),
            estimated_hours: r.estimated_hours,
            actual_hours: r.actual_hours,
            created_at: r
                .created_at
                .map(|dt| dt.to_rfc3339())
                .unwrap_or_default(),
            updated_at: r
                .updated_at
                .map(|dt| dt.to_rfc3339())
                .unwrap_or_default(),
        }
    }
}

#[derive(serde::Deserialize)]
pub struct ListFilters {
    pub r#type: Option<String>,
    pub status: Option<String>,
    pub priority: Option<String>,
}

pub async fn list_test_requirements(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Path(workspace_id): Path<String>,
    Query(filters): Query<ListFilters>,
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

    let items = match TestRequirementRepo::list_by_workspace(
        &state.db,
        &workspace_id,
        filters.r#type.as_deref(),
        filters.status.as_deref(),
        filters.priority.as_deref(),
    )
    .await
    {
        Ok(v) => v,
        Err(e) => return e.into_response(),
    };

    let output: Vec<TestRequirementOutput> =
        items.into_iter().map(TestRequirementOutput::from).collect();
    Json(ApiResponse {
        success: true,
        data: Some(output),
        error: None,
    })
    .into_response()
}

pub async fn get_test_requirement(
    State(state): State<Arc<AppState>>,
    _auth_user: AuthUser,
    Path(id): Path<String>,
) -> Response {
    let item = match TestRequirementRepo::find_by_id(&state.db, &id).await {
        Ok(Some(v)) => v,
        Ok(None) => {
            return AppError::NotFound("Test requirement not found".into()).into_response()
        }
        Err(e) => return e.into_response(),
    };

    Json(ApiResponse {
        success: true,
        data: Some(TestRequirementOutput::from(item)),
        error: None,
    })
    .into_response()
}

pub async fn get_children(
    State(state): State<Arc<AppState>>,
    _auth_user: AuthUser,
    Path(id): Path<String>,
) -> Response {
    // Verify parent exists
    match TestRequirementRepo::find_by_id(&state.db, &id).await {
        Ok(Some(_)) => {}
        Ok(None) => {
            return AppError::NotFound("Test requirement not found".into()).into_response()
        }
        Err(e) => return e.into_response(),
    };

    let children = match TestRequirementRepo::find_children(&state.db, &id).await {
        Ok(v) => v,
        Err(e) => return e.into_response(),
    };

    let output: Vec<TestRequirementOutput> = children
        .into_iter()
        .map(TestRequirementOutput::from)
        .collect();
    Json(ApiResponse {
        success: true,
        data: Some(output),
        error: None,
    })
    .into_response()
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateTestRequirementInput {
    pub title: String,
    pub description: Option<String>,
    pub content: Option<String>,
    pub r#type: Option<String>,
    pub status: Option<String>,
    pub priority: Option<String>,
    pub parent_id: Option<String>,
    pub tags: Option<serde_json::Value>,
    pub assignee_id: Option<String>,
    pub due_date: Option<chrono::DateTime<chrono::FixedOffset>>,
    pub estimated_hours: Option<String>,
}

pub async fn create_test_requirement(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Path(workspace_id): Path<String>,
    Json(body): Json<CreateTestRequirementInput>,
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

    let item = match TestRequirementRepo::create(
        &state.db,
        &workspace_id,
        &body.title,
        body.description.as_deref(),
        body.content.as_deref(),
        body.r#type.as_deref(),
        body.status.as_deref(),
        body.priority.as_deref(),
        body.parent_id.as_deref(),
        body.tags,
        body.assignee_id.as_deref(),
        &auth_user.user_id,
        body.due_date,
        body.estimated_hours.as_deref(),
    )
    .await
    {
        Ok(v) => v,
        Err(e) => return e.into_response(),
    };

    Json(ApiResponse {
        success: true,
        data: Some(TestRequirementOutput::from(item)),
        error: None,
    })
    .into_response()
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateTestRequirementInput {
    pub title: Option<String>,
    pub description: Option<Option<String>>,
    pub content: Option<Option<String>>,
    pub r#type: Option<String>,
    pub status: Option<String>,
    pub priority: Option<String>,
    pub parent_id: Option<Option<String>>,
    pub tags: Option<Option<serde_json::Value>>,
    pub assignee_id: Option<Option<String>>,
    pub due_date: Option<Option<chrono::DateTime<chrono::FixedOffset>>>,
    pub estimated_hours: Option<Option<String>>,
    pub actual_hours: Option<Option<String>>,
}

pub async fn update_test_requirement(
    State(state): State<Arc<AppState>>,
    _auth_user: AuthUser,
    Path(id): Path<String>,
    Json(body): Json<UpdateTestRequirementInput>,
) -> Response {
    let item = match TestRequirementRepo::update(
        &state.db,
        &id,
        body.title,
        body.description,
        body.content,
        body.r#type,
        body.status,
        body.priority,
        body.parent_id,
        body.tags,
        body.assignee_id,
        body.due_date,
        body.estimated_hours,
        body.actual_hours,
    )
    .await
    {
        Ok(v) => v,
        Err(e) => return e.into_response(),
    };

    Json(ApiResponse {
        success: true,
        data: Some(TestRequirementOutput::from(item)),
        error: None,
    })
    .into_response()
}

pub async fn delete_test_requirement(
    State(state): State<Arc<AppState>>,
    _auth_user: AuthUser,
    Path(id): Path<String>,
) -> Response {
    // Check for children before deleting
    match TestRequirementRepo::has_children(&state.db, &id).await {
        Ok(true) => {
            return AppError::BadRequest(
                "Cannot delete requirement with children. Delete children first.".into(),
            )
            .into_response();
        }
        Ok(false) => {}
        Err(e) => return e.into_response(),
    }

    if let Err(e) = TestRequirementRepo::delete(&state.db, &id).await {
        return e.into_response();
    }

    Json(ApiResponse {
        success: true,
        data: Some(serde_json::json!({ "id": id })),
        error: None,
    })
    .into_response()
}
