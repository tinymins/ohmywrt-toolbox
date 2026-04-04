use std::collections::HashMap;

use chrono::{Datelike, TimeZone, Utc};
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

    /// Batch count access logs grouped by subscribe_id.
    pub async fn count_by_subscribe_ids(
        db: &DatabaseConnection,
        subscribe_ids: &[Uuid],
    ) -> Result<HashMap<Uuid, u64>, AppError> {
        if subscribe_ids.is_empty() {
            return Ok(HashMap::new());
        }

        #[derive(Debug, FromQueryResult)]
        struct CountRow {
            subscribe_id: Uuid,
            cnt: i64,
        }

        let rows: Vec<CountRow> = proxy_access_logs::Entity::find()
            .select_only()
            .column(proxy_access_logs::Column::SubscribeId)
            .column_as(proxy_access_logs::Column::Id.count(), "cnt")
            .filter(
                proxy_access_logs::Column::SubscribeId.is_in(subscribe_ids.to_vec()),
            )
            .group_by(proxy_access_logs::Column::SubscribeId)
            .into_model::<CountRow>()
            .all(db)
            .await?;

        Ok(rows
            .into_iter()
            .map(|r| (r.subscribe_id, r.cnt as u64))
            .collect())
    }

    pub async fn count_by_subscribe_uuid(
        db: &DatabaseConnection,
        subscribe_id: Uuid,
    ) -> Result<u64, AppError> {
        Ok(proxy_access_logs::Entity::find()
            .filter(proxy_access_logs::Column::SubscribeId.eq(subscribe_id))
            .count(db)
            .await?)
    }

    /// Count access logs for a subscribe created today (UTC)
    pub async fn count_today_by_subscribe(
        db: &DatabaseConnection,
        subscribe_id: Uuid,
    ) -> Result<u64, AppError> {
        let now = Utc::now();
        let today_start = Utc
            .with_ymd_and_hms(now.year(), now.month(), now.day(), 0, 0, 0)
            .unwrap();
        Ok(proxy_access_logs::Entity::find()
            .filter(proxy_access_logs::Column::SubscribeId.eq(subscribe_id))
            .filter(proxy_access_logs::Column::CreatedAt.gte(today_start))
            .count(db)
            .await?)
    }

    /// Count today's access logs across multiple subscribes
    pub async fn count_today_by_user_subscribes(
        db: &DatabaseConnection,
        subscribe_ids: &[Uuid],
    ) -> Result<u64, AppError> {
        if subscribe_ids.is_empty() {
            return Ok(0);
        }
        let now = Utc::now();
        let today_start = Utc
            .with_ymd_and_hms(now.year(), now.month(), now.day(), 0, 0, 0)
            .unwrap();
        Ok(proxy_access_logs::Entity::find()
            .filter(proxy_access_logs::Column::SubscribeId.is_in(subscribe_ids.to_vec()))
            .filter(proxy_access_logs::Column::CreatedAt.gte(today_start))
            .count(db)
            .await?)
    }

    /// Group access logs by access_type for a subscribe, returns Vec<(type, count)>
    pub async fn count_by_access_type(
        db: &DatabaseConnection,
        subscribe_id: Uuid,
    ) -> Result<Vec<(String, u64)>, AppError> {
        #[derive(Debug, FromQueryResult)]
        struct TypeCount {
            access_type: String,
            count: i64,
        }

        let results = proxy_access_logs::Entity::find()
            .filter(proxy_access_logs::Column::SubscribeId.eq(subscribe_id))
            .select_only()
            .column(proxy_access_logs::Column::AccessType)
            .column_as(proxy_access_logs::Column::Id.count(), "count")
            .group_by(proxy_access_logs::Column::AccessType)
            .into_model::<TypeCount>()
            .all(db)
            .await?;

        Ok(results
            .into_iter()
            .map(|r| (r.access_type, r.count as u64))
            .collect())
    }

    /// Paginated recent access logs
    pub async fn recent_by_subscribe_paginated(
        db: &DatabaseConnection,
        subscribe_id: Uuid,
        page: u64,
        page_size: u64,
    ) -> Result<Vec<proxy_access_logs::Model>, AppError> {
        let offset = (page.saturating_sub(1)) * page_size;
        Ok(proxy_access_logs::Entity::find()
            .filter(proxy_access_logs::Column::SubscribeId.eq(subscribe_id))
            .order_by_desc(proxy_access_logs::Column::CreatedAt)
            .offset(offset)
            .limit(page_size)
            .all(db)
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
