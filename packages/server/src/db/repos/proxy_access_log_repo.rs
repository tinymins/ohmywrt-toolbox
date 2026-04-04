use sea_orm::*;
use uuid::Uuid;

use crate::db::entities::proxy_access_logs;
use crate::error::{parse_uuid, AppError};

pub struct ProxyAccessLogRepo;

impl ProxyAccessLogRepo {
    pub async fn create(
        db: &DatabaseConnection,
        subscribe_id: Uuid,
        access_type: &str,
        ip: Option<&str>,
        user_agent: Option<&str>,
        node_count: Option<i32>,
    ) -> Result<proxy_access_logs::Model, AppError> {
        let id = Uuid::new_v4();

        let record = proxy_access_logs::ActiveModel {
            id: Set(id),
            subscribe_id: Set(subscribe_id),
            access_type: Set(access_type.to_string()),
            ip: Set(ip.map(String::from)),
            user_agent: Set(user_agent.map(String::from)),
            node_count: Set(node_count.or(Some(0))),
            created_at: NotSet,
        };
        proxy_access_logs::Entity::insert(record).exec(db).await?;

        proxy_access_logs::Entity::find_by_id(id)
            .one(db)
            .await?
            .ok_or_else(|| AppError::Internal("failed to fetch created access log".into()))
    }

    pub async fn count_by_subscribe(
        db: &DatabaseConnection,
        subscribe_id: &str,
    ) -> Result<u64, AppError> {
        let sid = parse_uuid(subscribe_id)?;
        Ok(proxy_access_logs::Entity::find()
            .filter(proxy_access_logs::Column::SubscribeId.eq(sid))
            .count(db)
            .await?)
    }

    pub async fn recent_by_subscribe(
        db: &DatabaseConnection,
        subscribe_id: &str,
        limit: u64,
    ) -> Result<Vec<proxy_access_logs::Model>, AppError> {
        let sid = parse_uuid(subscribe_id)?;
        Ok(proxy_access_logs::Entity::find()
            .filter(proxy_access_logs::Column::SubscribeId.eq(sid))
            .order_by_desc(proxy_access_logs::Column::CreatedAt)
            .limit(limit)
            .all(db)
            .await?)
    }

    pub async fn count_by_user_subscribes(
        db: &DatabaseConnection,
        subscribe_ids: &[Uuid],
    ) -> Result<u64, AppError> {
        if subscribe_ids.is_empty() {
            return Ok(0);
        }
        Ok(proxy_access_logs::Entity::find()
            .filter(proxy_access_logs::Column::SubscribeId.is_in(subscribe_ids.to_vec()))
            .count(db)
            .await?)
    }
}
