# 工作空间与多租户

## 工作空间模型

工作空间用于隔离不同用户/团队的资源。每个用户可以拥有多个工作空间，也可以被邀请加入他人的工作空间。

### 数据模型

#### Workspace

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID PK | 主键 |
| slug | String UNIQUE | URL 友好标识符 |
| name | String | 显示名 |
| description | String | 描述 |
| ownerId | UUID FK | 创建者 |

#### WorkspaceMember

| 字段 | 类型 | 说明 |
|------|------|------|
| workspaceId | UUID FK | 关联工作空间 |
| userId | UUID FK | 关联用户 |
| role | Enum | member / admin |

## 单工作空间模式

当环境变量 `SINGLE_WORKSPACE_MODE=true` 时，系统进入单工作空间模式：

- 自动创建"System Shared"工作空间（slug: `system-shared`）
- 所有用户自动加入该工作空间
- 禁止创建/删除工作空间
- 登录后直接进入共享工作空间（`/dashboard` 而非 `/dashboard/{slug}`）

**适用场景**：个人部署或小团队共用，无需多工作空间隔离。

## 路由结构

```
/dashboard
  /{workspace}              → 工作空间首页
  /{workspace}/proxy        → 代理订阅管理
  /{workspace}/network      → 网络工具
  /{workspace}/settings     → 工作空间设置
  /{workspace}/members      → 成员管理
  /{workspace}/admin        → 管理面板（admin+）
```

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/workspaces | 用户的工作空间列表 |
| POST | /api/workspaces | 创建工作空间 |
| GET | /api/workspaces/{slug} | 获取详情（成员检查） |
| PATCH | /api/workspaces/{id} | 更新（所有者） |
| DELETE | /api/workspaces/{id} | 删除（所有者） |
| GET | /api/workspaces/{id}/members | 成员列表 |
| POST | /api/workspaces/{id}/members | 添加成员 |
| PATCH | /api/workspaces/{id}/members/{uid} | 修改成员角色 |
| DELETE | /api/workspaces/{id}/members/{uid} | 移除成员 |

## 权限模型

```
工作空间操作
  │
  ├─ 查看 → 必须是成员
  ├─ 编辑 → 必须是所有者或工作空间 admin
  ├─ 删除 → 必须是所有者
  └─ 管理成员 → 必须是所有者
```
