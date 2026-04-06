# 认证与用户系统

## 认证机制

### Session-Based Authentication

系统使用基于 Cookie 的会话认证，不使用 JWT。

```
登录流程：

  POST /api/auth/login { email, password }
      │
      ▼
  查找用户 → Argon2 验证密码
      │
      ▼
  创建 Session（UUID + 7天过期）→ 写入数据库
      │
      ▼
  Set-Cookie: SESSION_ID={uuid}; HttpOnly; SameSite=Lax; Max-Age=604800
      │
      ▼
  返回 { user, defaultWorkspaceSlug }
```

### 请求鉴权

每个需要认证的请求通过 Axum `FromRequestParts` 提取器 `AuthUser` 鉴权：

```
请求到达
  │
  ▼
解析 Cookie 头 → 提取 SESSION_ID
  │
  ▼
数据库查询 sessions 表 → 检查 expiresAt > NOW
  │
  ▼
通过 user_id 查询用户
  │
  ▼
返回 AuthUser { user_id, session_id, role }
```

### 角色体系

| 角色 | 权限 |
|------|------|
| superadmin | 管理所有用户、系统设置、邀请码 |
| admin | 管理用户、工作空间、邀请码 |
| user | 管理自己的订阅、加入工作空间、基础资料 |

## API 端点

### 认证

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/auth/register | 注册（可选邀请码） |
| POST | /api/auth/login | 登录 |
| POST | /api/auth/logout | 登出 |
| GET | /api/auth/registration-status | 注册是否开放 |
| PUT | /api/auth/settings | 系统设置（superadmin） |

### 用户资料

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/user/profile | 当前用户资料 |
| PATCH | /api/user/profile | 更新资料 |
| POST | /api/user/profile/avatar | 上传头像 |
| DELETE | /api/user/profile/avatar | 删除头像 |
| PATCH | /api/user/profile/password | 修改密码（注销其他会话） |

### 管理员

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/admin/users | 用户列表（admin+） |
| POST | /api/admin/users | 创建用户（superadmin） |
| PATCH | /api/admin/users/{id} | 修改角色（superadmin） |
| DELETE | /api/admin/users/{id} | 删除用户（superadmin） |

## 邀请码

```
POST /api/admin/invitations
Input: { expiresAt?, maxUses? }
Output: { code, createdAt, expiresAt }
```

注册时提交 `invitationCode` 验证：
- 邀请码存在
- 未过期（expiresAt > NOW）
- 使用次数未耗尽

## 系统设置

| 设置 | 说明 |
|------|------|
| allowRegistration | 是否开放注册 |
| singleWorkspaceMode | 单工作空间模式 |

## 数据模型

### User

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID PK | 主键 |
| email | String UNIQUE | 邮箱 |
| passwordHash | String | Argon2 哈希 |
| name | String | 显示名 |
| role | Enum | superadmin / admin / user |
| settings | JSONB | 个人设置（头像、语言、主题） |
| lastLoginAt | DateTime | 最后登录时间 |

### Session

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID PK | 会话 ID（即 Cookie 值） |
| userId | UUID FK | 关联用户 |
| expiresAt | DateTime | 过期时间 |

## 头像存储

- 后端使用 OpenDAL 抽象（本地文件系统或 S3）
- 上传路径：`storage/{user_id}/{filename}`
- 数据库存储 **key**（如 `avatars/1234.jpg`），不存储完整 URL
- 前端通过 `GET /storage/{key}` 访问
