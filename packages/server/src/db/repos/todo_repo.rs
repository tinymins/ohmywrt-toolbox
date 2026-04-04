use chrono::Utc;
use sea_orm::*;
use uuid::Uuid;

use crate::db::entities::todos;
use crate::error::{parse_uuid, AppError};

pub struct TodoRepo;

impl TodoRepo {
    pub async fn list_by_workspace(
        db: &DatabaseConnection,
        workspace_id: &str,
    ) -> Result<Vec<todos::Model>, AppError> {
        let ws_id = parse_uuid(workspace_id)?;
        Ok(todos::Entity::find()
            .filter(todos::Column::WorkspaceId.eq(ws_id))
            .order_by_desc(todos::Column::CreatedAt)
            .all(db)
            .await?)
    }

    pub async fn create(
        db: &DatabaseConnection,
        workspace_id: &str,
        title: &str,
        category: Option<&str>,
        created_by: &str,
    ) -> Result<todos::Model, AppError> {
        let ws_id = parse_uuid(workspace_id)?;
        let user_id = parse_uuid(created_by)?;
        let id = Uuid::new_v4();

        let todo = todos::ActiveModel {
            id: Set(id),
            workspace_id: Set(ws_id),
            title: Set(title.to_string()),
            category: Set(category.unwrap_or("默认").to_string()),
            completed: NotSet,
            created_by: Set(Some(user_id)),
            created_at: NotSet,
            updated_at: NotSet,
        };
        todos::Entity::insert(todo).exec(db).await?;

        todos::Entity::find_by_id(id)
            .one(db)
            .await?
            .ok_or_else(|| AppError::Internal("failed to fetch created todo".into()))
    }

    pub async fn find_by_id(
        db: &DatabaseConnection,
        id: &str,
    ) -> Result<Option<todos::Model>, AppError> {
        let uid = parse_uuid(id)?;
        Ok(todos::Entity::find_by_id(uid).one(db).await?)
    }

    pub async fn update(
        db: &DatabaseConnection,
        id: &str,
        title: Option<String>,
        category: Option<String>,
        completed: Option<bool>,
    ) -> Result<todos::Model, AppError> {
        let uid = parse_uuid(id)?;
        let todo = todos::Entity::find_by_id(uid)
            .one(db)
            .await?
            .ok_or_else(|| AppError::NotFound("Todo not found".into()))?;

        let mut active: todos::ActiveModel = todo.into();
        if let Some(t) = title {
            active.title = Set(t);
        }
        if let Some(c) = category {
            active.category = Set(c);
        }
        if let Some(c) = completed {
            active.completed = Set(c);
        }
        active.updated_at = Set(Some(Utc::now().into()));
        Ok(active.update(db).await?)
    }

    pub async fn delete(db: &DatabaseConnection, id: &str) -> Result<(), AppError> {
        let uid = parse_uuid(id)?;
        todos::Entity::delete_by_id(uid).exec(db).await?;
        Ok(())
    }
}
