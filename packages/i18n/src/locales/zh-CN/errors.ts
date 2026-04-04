const errors = {
  common: {
    unauthorized: "未登录",
    forbidden: "无权限访问",
    adminRequired: "需要管理员权限",
    superadminRequired: "需要超级管理员权限",
    requestFailed: "请求失败",
    missingWorkspace: "缺少工作空间参数",
    workspaceForbidden: "无权限访问该工作空间",
    invalidFileType: "仅支持 JPEG、PNG、WebP 或 GIF 格式的图片",
    fileTooLarge: "文件不能超过 5 MB",
  },
  auth: {
    invalidCredentials: "账号或密码错误",
    defaultWorkspaceNotFound: "未找到默认工作空间",
    emailAlreadyRegistered: "邮箱已注册",
    tooManyRequests: "请求过于频繁，请稍后再试",
    wechatLoginFailed: "微信登录失败",
    wechatPhoneFailed: "获取手机号失败",
  },
  user: {
    notFound: "用户不存在",
    emailInUse: "邮箱已被使用",
  },
  workspace: {
    notFound: "工作空间不存在",
    notFoundDesc: "不存在，或你没有访问权限。",
    onlyOwnerCanUpdate: "仅创建者可修改",
    onlyOwnerCanDelete: "仅创建者可删除",
    slugExists: "Slug 已存在",
  },
  admin: {
    cannotModifySelf: "不能修改自己的角色",
    cannotChangeOwnRole: "不能修改自己的角色",
    cannotDeleteSelf: "不能删除自己的账户",
    cannotDeleteSuperadmin: "不能删除超级管理员账户",
    cannotResetOwnPassword: "请使用个人设置修改密码",
    usePersonalSettings: "请使用个人设置修改密码",
    userNotFound: "用户不存在",
    emailAlreadyRegistered: "邮箱已被注册",
    invalidInvitationCode: "邀请码无效",
    invitationCodeExpired: "邀请码已过期",
    defaultWorkspaceDesc: "的默认工作空间",
    workspaceSuffix: "的工作空间",
  },
};

export default errors;
