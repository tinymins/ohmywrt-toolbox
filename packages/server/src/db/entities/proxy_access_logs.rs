use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "proxy_access_logs")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub subscribe_id: Uuid,
    #[sea_orm(column_type = "Text")]
    pub access_type: String,
    #[sea_orm(column_type = "Text", nullable)]
    pub ip: Option<String>,
    #[sea_orm(column_type = "Text", nullable)]
    pub user_agent: Option<String>,
    pub node_count: Option<i32>,
    pub created_at: Option<DateTimeWithTimeZone>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::proxy_subscribes::Entity",
        from = "Column::SubscribeId",
        to = "super::proxy_subscribes::Column::Id",
        on_update = "Cascade",
        on_delete = "Cascade"
    )]
    ProxySubscribes,
}

impl Related<super::proxy_subscribes::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::ProxySubscribes.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
