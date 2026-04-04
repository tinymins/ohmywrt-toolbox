use chrono::Utc;
use sea_orm::*;
use uuid::Uuid;

use crate::db::entities::test_requirements;
use crate::error::{parse_uuid, AppError};

/// Maximum number of retries when a generated code collides.
const CODE_GEN_MAX_RETRIES: u32 = 5;

pub struct TestRequirementRepo;

impl TestRequirementRepo {
    pub async fn list_by_workspace(
        db: &DatabaseConnection,
        workspace_id: &str,
        type_filter: Option<&str>,
        status_filter: Option<&str>,
        priority_filter: Option<&str>,
    ) -> Result<Vec<test_requirements::Model>, AppError> {
        let ws_id = parse_uuid(workspace_id)?;
        let mut query = test_requirements::Entity::find()
            .filter(test_requirements::Column::WorkspaceId.eq(ws_id));

        if let Some(t) = type_filter {
            query = query.filter(test_requirements::Column::Type.eq(t));
        }
        if let Some(s) = status_filter {
            query = query.filter(test_requirements::Column::Status.eq(s));
        }
        if let Some(p) = priority_filter {
            query = query.filter(test_requirements::Column::Priority.eq(p));
        }

        Ok(query
            .order_by_asc(test_requirements::Column::Code)
            .all(db)
            .await?)
    }

    pub async fn find_by_id(
        db: &DatabaseConnection,
        id: &str,
    ) -> Result<Option<test_requirements::Model>, AppError> {
        let uid = parse_uuid(id)?;
        Ok(test_requirements::Entity::find_by_id(uid).one(db).await?)
    }

    pub async fn find_children(
        db: &DatabaseConnection,
        parent_id: &str,
    ) -> Result<Vec<test_requirements::Model>, AppError> {
        let pid = parse_uuid(parent_id)?;
        Ok(test_requirements::Entity::find()
            .filter(test_requirements::Column::ParentId.eq(pid))
            .order_by_asc(test_requirements::Column::Code)
            .all(db)
            .await?)
    }

    pub async fn has_children(
        db: &DatabaseConnection,
        id: &str,
    ) -> Result<bool, AppError> {
        let uid = parse_uuid(id)?;
        let count = test_requirements::Entity::find()
            .filter(test_requirements::Column::ParentId.eq(uid))
            .count(db)
            .await?;
        Ok(count > 0)
    }

    /// Generate the next code (TR-0001, TR-0002, …) inside a transaction
    /// using `SELECT MAX(code)` to find the current maximum.
    async fn next_code_in_txn(
        txn: &DatabaseTransaction,
        workspace_id: Uuid,
    ) -> Result<String, AppError> {
        let max_row = test_requirements::Entity::find()
            .filter(test_requirements::Column::WorkspaceId.eq(workspace_id))
            .order_by_desc(test_requirements::Column::Code)
            .limit(1)
            .one(txn)
            .await?;

        let next_num = match max_row {
            Some(row) => {
                row.code
                    .strip_prefix("TR-")
                    .and_then(|n| n.parse::<u32>().ok())
                    .unwrap_or(0)
                    + 1
            }
            None => 1,
        };

        Ok(format!("TR-{:04}", next_num))
    }

    pub async fn create(
        db: &DatabaseConnection,
        workspace_id: &str,
        title: &str,
        description: Option<&str>,
        content: Option<&str>,
        r#type: Option<&str>,
        status: Option<&str>,
        priority: Option<&str>,
        parent_id: Option<&str>,
        tags: Option<serde_json::Value>,
        assignee_id: Option<&str>,
        created_by: &str,
        due_date: Option<chrono::DateTime<chrono::FixedOffset>>,
        estimated_hours: Option<&str>,
    ) -> Result<test_requirements::Model, AppError> {
        let ws_id = parse_uuid(workspace_id)?;
        let user_id = parse_uuid(created_by)?;

        let parent = if let Some(pid_str) = parent_id {
            let pid = parse_uuid(pid_str)?;
            let parent_model = test_requirements::Entity::find_by_id(pid)
                .one(db)
                .await?
                .ok_or_else(|| AppError::NotFound("Parent requirement not found".into()))?;
            if parent_model.workspace_id != ws_id {
                return Err(AppError::BadRequest(
                    "Parent requirement must be in the same workspace".into(),
                ));
            }
            Some(pid)
        } else {
            None
        };

        let assignee = if let Some(aid_str) = assignee_id {
            Some(parse_uuid(aid_str)?)
        } else {
            None
        };

        // Retry loop: generate code inside a transaction; retry on unique conflict
        let mut last_err: Option<AppError> = None;
        for _ in 0..CODE_GEN_MAX_RETRIES {
            let txn = db.begin().await?;

            let code = Self::next_code_in_txn(&txn, ws_id).await?;
            let id = Uuid::new_v4();

            let record = test_requirements::ActiveModel {
                id: Set(id),
                workspace_id: Set(ws_id),
                code: Set(code),
                title: Set(title.to_string()),
                description: Set(description.map(String::from)),
                content: Set(content.map(String::from)),
                r#type: Set(r#type.unwrap_or("functional").to_string()),
                status: Set(status.unwrap_or("draft").to_string()),
                priority: Set(priority.unwrap_or("medium").to_string()),
                parent_id: Set(parent),
                tags: Set(tags.clone()),
                assignee_id: Set(assignee),
                created_by: Set(Some(user_id)),
                due_date: Set(due_date),
                estimated_hours: Set(estimated_hours.map(String::from)),
                actual_hours: NotSet,
                created_at: NotSet,
                updated_at: NotSet,
            };

            match test_requirements::Entity::insert(record).exec(&txn).await {
                Ok(_) => {
                    txn.commit().await?;
                    return test_requirements::Entity::find_by_id(id)
                        .one(db)
                        .await?
                        .ok_or_else(|| {
                            AppError::Internal(
                                "failed to fetch created test requirement".into(),
                            )
                        });
                }
                Err(e) => {
                    let _ = txn.rollback().await;
                    let msg = e.to_string();
                    if msg.contains("duplicate") || msg.contains("unique") {
                        last_err = Some(AppError::Database(e));
                        continue;
                    }
                    return Err(AppError::Database(e));
                }
            }
        }

        Err(last_err.unwrap_or_else(|| {
            AppError::Internal("Failed to generate unique requirement code".into())
        }))
    }

    #[allow(clippy::too_many_arguments)]
    pub async fn update(
        db: &DatabaseConnection,
        id: &str,
        title: Option<String>,
        description: Option<Option<String>>,
        content: Option<Option<String>>,
        r#type: Option<String>,
        status: Option<String>,
        priority: Option<String>,
        parent_id: Option<Option<String>>,
        tags: Option<Option<serde_json::Value>>,
        assignee_id: Option<Option<String>>,
        due_date: Option<Option<chrono::DateTime<chrono::FixedOffset>>>,
        estimated_hours: Option<Option<String>>,
        actual_hours: Option<Option<String>>,
    ) -> Result<test_requirements::Model, AppError> {
        let uid = parse_uuid(id)?;
        let record = test_requirements::Entity::find_by_id(uid)
            .one(db)
            .await?
            .ok_or_else(|| AppError::NotFound("Test requirement not found".into()))?;

        let mut active: test_requirements::ActiveModel = record.clone().into();

        if let Some(t) = title {
            active.title = Set(t);
        }
        if let Some(d) = description {
            active.description = Set(d);
        }
        if let Some(c) = content {
            active.content = Set(c);
        }
        if let Some(t) = r#type {
            active.r#type = Set(t);
        }
        if let Some(s) = status {
            active.status = Set(s);
        }
        if let Some(p) = priority {
            active.priority = Set(p);
        }
        if let Some(pid_opt) = parent_id {
            match pid_opt {
                Some(pid_str) => {
                    let pid = parse_uuid(&pid_str)?;
                    let parent_model = test_requirements::Entity::find_by_id(pid)
                        .one(db)
                        .await?
                        .ok_or_else(|| {
                            AppError::NotFound("Parent requirement not found".into())
                        })?;
                    if parent_model.workspace_id != record.workspace_id {
                        return Err(AppError::BadRequest(
                            "Parent requirement must be in the same workspace".into(),
                        ));
                    }
                    active.parent_id = Set(Some(pid));
                }
                None => {
                    active.parent_id = Set(None);
                }
            }
        }
        if let Some(t) = tags {
            active.tags = Set(t);
        }
        if let Some(aid_opt) = assignee_id {
            match aid_opt {
                Some(aid_str) => {
                    let aid = parse_uuid(&aid_str)?;
                    active.assignee_id = Set(Some(aid));
                }
                None => {
                    active.assignee_id = Set(None);
                }
            }
        }
        if let Some(d) = due_date {
            active.due_date = Set(d);
        }
        if let Some(e) = estimated_hours {
            active.estimated_hours = Set(e);
        }
        if let Some(a) = actual_hours {
            active.actual_hours = Set(a);
        }
        active.updated_at = Set(Some(Utc::now().into()));
        Ok(active.update(db).await?)
    }

    pub async fn delete(db: &DatabaseConnection, id: &str) -> Result<(), AppError> {
        let uid = parse_uuid(id)?;
        test_requirements::Entity::delete_by_id(uid)
            .exec(db)
            .await?;
        Ok(())
    }
}
