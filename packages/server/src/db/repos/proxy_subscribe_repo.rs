use chrono::Utc;
use sea_orm::*;
use uuid::Uuid;

use crate::db::entities::proxy_subscribes;
use crate::error::{parse_uuid, AppError};

/// Validate that a JSON value is an array of strings. Returns a normalized
/// `serde_json::Value::Array` (always `[]` when input is `None` or invalid).
fn normalize_authorized_user_ids(
    value: Option<serde_json::Value>,
) -> Result<serde_json::Value, AppError> {
    match value {
        None => Ok(serde_json::json!([])),
        Some(serde_json::Value::Array(arr)) => {
            for item in &arr {
                if !item.is_string() {
                    return Err(AppError::BadRequest(
                        "authorized_user_ids must be an array of strings".into(),
                    ));
                }
            }
            Ok(serde_json::Value::Array(arr))
        }
        Some(_) => Err(AppError::BadRequest(
            "authorized_user_ids must be an array of strings".into(),
        )),
    }
}

pub struct ProxySubscribeRepo;

impl ProxySubscribeRepo {
    /// List subscriptions owned by or authorized for a user
    pub async fn list_by_user(
        db: &DatabaseConnection,
        user_id: &str,
    ) -> Result<Vec<proxy_subscribes::Model>, AppError> {
        let uid = parse_uuid(user_id)?;
        let uid_str = uid.to_string();

        let owned = proxy_subscribes::Entity::find()
            .filter(proxy_subscribes::Column::UserId.eq(uid))
            .all(db)
            .await?;

        // Filter authorized subscriptions in application layer
        let authorized = proxy_subscribes::Entity::find()
            .filter(proxy_subscribes::Column::UserId.ne(uid))
            .all(db)
            .await?
            .into_iter()
            .filter(|s| {
                s.authorized_user_ids
                    .as_ref()
                    .and_then(|v: &serde_json::Value| v.as_array())
                    .is_some_and(|arr: &Vec<serde_json::Value>| {
                        arr.iter()
                            .any(|id: &serde_json::Value| id.as_str() == Some(&uid_str))
                    })
            })
            .collect::<Vec<_>>();

        let mut result = owned;
        result.extend(authorized);
        result.sort_by(|a, b| b.created_at.cmp(&a.created_at));
        Ok(result)
    }

    pub async fn find_by_id(
        db: &DatabaseConnection,
        id: &str,
    ) -> Result<Option<proxy_subscribes::Model>, AppError> {
        let uid = parse_uuid(id)?;
        Ok(proxy_subscribes::Entity::find_by_id(uid).one(db).await?)
    }

    pub async fn find_by_url(
        db: &DatabaseConnection,
        url: &str,
    ) -> Result<Option<proxy_subscribes::Model>, AppError> {
        Ok(proxy_subscribes::Entity::find()
            .filter(proxy_subscribes::Column::Url.eq(url))
            .one(db)
            .await?)
    }

    /// Check if a user owns or is authorized for a subscription
    pub fn is_authorized(sub: &proxy_subscribes::Model, user_id: &str) -> bool {
        let owner = sub.user_id.to_string() == user_id;
        let authorized = sub
            .authorized_user_ids
            .as_ref()
            .and_then(|v: &serde_json::Value| v.as_array())
            .is_some_and(|arr: &Vec<serde_json::Value>| {
                arr.iter()
                    .any(|id: &serde_json::Value| id.as_str() == Some(user_id))
            });
        owner || authorized
    }

    pub fn is_owner(sub: &proxy_subscribes::Model, user_id: &str) -> bool {
        sub.user_id.to_string() == user_id
    }

    #[allow(clippy::too_many_arguments)]
    pub async fn create(
        db: &DatabaseConnection,
        user_id: &str,
        remark: Option<&str>,
        subscribe_url: Option<&str>,
        subscribe_items: Option<serde_json::Value>,
        rule_list: Option<&str>,
        use_system_rule_list: Option<bool>,
        group: Option<&str>,
        use_system_group: Option<bool>,
        filter: Option<&str>,
        use_system_filter: Option<bool>,
        servers: Option<&str>,
        custom_config: Option<&str>,
        use_system_custom_config: Option<bool>,
        dns_config: Option<&str>,
        use_system_dns_config: Option<bool>,
        authorized_user_ids: Option<serde_json::Value>,
        cache_ttl_minutes: Option<i32>,
    ) -> Result<proxy_subscribes::Model, AppError> {
        let uid = parse_uuid(user_id)?;
        let id = Uuid::new_v4();
        // Auto-generate an opaque random token — never accepted from user input
        let url_token = Uuid::new_v4().to_string();
        let auth_ids = normalize_authorized_user_ids(authorized_user_ids)?;

        let record = proxy_subscribes::ActiveModel {
            id: Set(id),
            user_id: Set(uid),
            url: Set(url_token),
            remark: Set(remark.map(String::from)),
            subscribe_url: Set(subscribe_url.map(String::from)),
            subscribe_items: Set(subscribe_items),
            rule_list: Set(rule_list.map(String::from)),
            use_system_rule_list: Set(use_system_rule_list.unwrap_or(true)),
            group: Set(group.map(String::from)),
            use_system_group: Set(use_system_group.unwrap_or(true)),
            filter: Set(filter.map(String::from)),
            use_system_filter: Set(use_system_filter.unwrap_or(true)),
            servers: Set(servers.map(String::from)),
            custom_config: Set(custom_config.map(String::from)),
            use_system_custom_config: Set(use_system_custom_config.unwrap_or(true)),
            dns_config: Set(dns_config.map(String::from)),
            use_system_dns_config: Set(use_system_dns_config.unwrap_or(true)),
            authorized_user_ids: Set(Some(auth_ids)),
            cache_ttl_minutes: Set(cache_ttl_minutes),
            cached_node_count: NotSet,
            last_access_at: NotSet,
            created_at: Set(Some(Utc::now().into())),
            updated_at: Set(Some(Utc::now().into())),
        };
        proxy_subscribes::Entity::insert(record).exec(db).await?;

        proxy_subscribes::Entity::find_by_id(id)
            .one(db)
            .await?
            .ok_or_else(|| AppError::Internal("failed to fetch created subscription".into()))
    }

    #[allow(clippy::too_many_arguments)]
    pub async fn update(
        db: &DatabaseConnection,
        id: &str,
        remark: Option<Option<String>>,
        subscribe_url: Option<Option<String>>,
        subscribe_items: Option<Option<serde_json::Value>>,
        rule_list: Option<Option<String>>,
        use_system_rule_list: Option<bool>,
        group: Option<Option<String>>,
        use_system_group: Option<bool>,
        filter: Option<Option<String>>,
        use_system_filter: Option<bool>,
        servers: Option<Option<String>>,
        custom_config: Option<Option<String>>,
        use_system_custom_config: Option<bool>,
        dns_config: Option<Option<String>>,
        use_system_dns_config: Option<bool>,
        authorized_user_ids: Option<Option<serde_json::Value>>,
        cache_ttl_minutes: Option<Option<i32>>,
    ) -> Result<proxy_subscribes::Model, AppError> {
        let uid = parse_uuid(id)?;
        let record = proxy_subscribes::Entity::find_by_id(uid)
            .one(db)
            .await?
            .ok_or_else(|| AppError::NotFound("Subscription not found".into()))?;

        let mut active: proxy_subscribes::ActiveModel = record.into();

        if let Some(v) = remark {
            active.remark = Set(v);
        }
        if let Some(v) = subscribe_url {
            active.subscribe_url = Set(v);
        }
        if let Some(v) = subscribe_items {
            active.subscribe_items = Set(v);
        }
        if let Some(v) = rule_list {
            active.rule_list = Set(v);
        }
        if let Some(v) = use_system_rule_list {
            active.use_system_rule_list = Set(v);
        }
        if let Some(v) = group {
            active.group = Set(v);
        }
        if let Some(v) = use_system_group {
            active.use_system_group = Set(v);
        }
        if let Some(v) = filter {
            active.filter = Set(v);
        }
        if let Some(v) = use_system_filter {
            active.use_system_filter = Set(v);
        }
        if let Some(v) = servers {
            active.servers = Set(v);
        }
        if let Some(v) = custom_config {
            active.custom_config = Set(v);
        }
        if let Some(v) = use_system_custom_config {
            active.use_system_custom_config = Set(v);
        }
        if let Some(v) = dns_config {
            active.dns_config = Set(v);
        }
        if let Some(v) = use_system_dns_config {
            active.use_system_dns_config = Set(v);
        }
        if let Some(v) = authorized_user_ids {
            // Normalize: None → [], validate array-of-strings
            let normalized = normalize_authorized_user_ids(v)?;
            active.authorized_user_ids = Set(Some(normalized));
        }
        if let Some(v) = cache_ttl_minutes {
            active.cache_ttl_minutes = Set(v);
        }
        active.updated_at = Set(Some(Utc::now().into()));
        Ok(active.update(db).await?)
    }

    pub async fn delete(db: &DatabaseConnection, id: &str) -> Result<(), AppError> {
        let uid = parse_uuid(id)?;
        proxy_subscribes::Entity::delete_by_id(uid)
            .exec(db)
            .await?;
        Ok(())
    }

    /// Update last_access_at timestamp
    pub async fn touch_access(db: &DatabaseConnection, id: Uuid) -> Result<(), AppError> {
        let record = proxy_subscribes::Entity::find_by_id(id)
            .one(db)
            .await?
            .ok_or_else(|| AppError::NotFound("Subscription not found".into()))?;
        let mut active: proxy_subscribes::ActiveModel = record.into();
        active.last_access_at = Set(Some(Utc::now().into()));
        active.update(db).await?;
        Ok(())
    }
}
