use axum::routing::{get, patch};
use axum::Router;
use std::sync::Arc;

use crate::handlers::todo;
use crate::AppState;

pub fn build_todo_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route(
            "/api/workspaces/{workspace_id}/todos",
            get(todo::list_todos).post(todo::create_todo),
        )
        .route(
            "/api/todos/{id}",
            patch(todo::update_todo).delete(todo::delete_todo),
        )
}
