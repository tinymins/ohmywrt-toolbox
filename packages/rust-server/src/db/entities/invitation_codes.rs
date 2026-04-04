use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
#[sea_orm(table_name = "invitation_codes")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false, column_type = "Text")]
    pub id: String,
    #[sea_orm(column_type = "Text", unique)]
    pub code: String,
    #[sea_orm(column_name = "created_by", column_type = "Text")]
    pub created_by: String,
    #[sea_orm(column_name = "used_by", column_type = "Text", nullable)]
    pub used_by: Option<String>,
    #[sea_orm(column_name = "used_at")]
    pub used_at: Option<DateTimeWithTimeZone>,
    #[sea_orm(column_name = "expires_at")]
    pub expires_at: Option<DateTimeWithTimeZone>,
    #[sea_orm(column_name = "created_at")]
    pub created_at: Option<DateTimeWithTimeZone>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
