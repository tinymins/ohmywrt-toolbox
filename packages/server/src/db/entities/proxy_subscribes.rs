use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "proxy_subscribes")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub user_id: Uuid,
    #[sea_orm(column_type = "Text", unique)]
    pub url: String,
    #[sea_orm(column_type = "Text", nullable)]
    pub remark: Option<String>,
    #[sea_orm(column_type = "Text", nullable)]
    pub subscribe_url: Option<String>,
    #[sea_orm(column_type = "JsonBinary", nullable)]
    pub subscribe_items: Option<serde_json::Value>,
    #[sea_orm(column_type = "Text", nullable)]
    pub rule_list: Option<String>,
    pub use_system_rule_list: bool,
    #[sea_orm(column_type = "Text", nullable)]
    pub group: Option<String>,
    pub use_system_group: bool,
    #[sea_orm(column_type = "Text", nullable)]
    pub filter: Option<String>,
    pub use_system_filter: bool,
    #[sea_orm(column_type = "Text", nullable)]
    pub servers: Option<String>,
    #[sea_orm(column_type = "Text", nullable)]
    pub custom_config: Option<String>,
    pub use_system_custom_config: bool,
    #[sea_orm(column_type = "Text", nullable)]
    pub dns_config: Option<String>,
    pub use_system_dns_config: bool,
    #[sea_orm(column_type = "JsonBinary", nullable)]
    pub authorized_user_ids: Option<serde_json::Value>,
    pub cache_ttl_minutes: Option<i32>,
    pub cached_node_count: Option<i32>,
    pub last_access_at: Option<DateTimeWithTimeZone>,
    pub created_at: Option<DateTimeWithTimeZone>,
    pub updated_at: Option<DateTimeWithTimeZone>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::users::Entity",
        from = "Column::UserId",
        to = "super::users::Column::Id",
        on_update = "Cascade",
        on_delete = "Cascade"
    )]
    Users,
    #[sea_orm(has_many = "super::proxy_access_logs::Entity")]
    ProxyAccessLogs,
}

impl Related<super::users::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Users.def()
    }
}

impl Related<super::proxy_access_logs::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::ProxyAccessLogs.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
