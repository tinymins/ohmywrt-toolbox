use axum::routing::get;
use axum::Router;
use std::sync::Arc;

use crate::handlers::test_requirement;
use crate::AppState;

pub fn build_test_requirement_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route(
            "/api/workspaces/{workspace_id}/test-requirements",
            get(test_requirement::list_test_requirements)
                .post(test_requirement::create_test_requirement),
        )
        .route(
            "/api/test-requirements/{id}",
            get(test_requirement::get_test_requirement)
                .patch(test_requirement::update_test_requirement)
                .delete(test_requirement::delete_test_requirement),
        )
        .route(
            "/api/test-requirements/{id}/children",
            get(test_requirement::get_children),
        )
}
