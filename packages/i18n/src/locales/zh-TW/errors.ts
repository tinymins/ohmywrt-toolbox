const errors = {
  common: {
    unauthorized: "未登入",
    forbidden: "無權限存取",
    adminRequired: "需要管理員權限",
    superadminRequired: "需要超級管理員權限",
    requestFailed: "請求失敗",
    missingWorkspace: "缺少工作空間參數",
    workspaceForbidden: "無權限存取此工作空間",
    invalidFileType: "僅支援 JPEG、PNG、WebP 或 GIF 格式的圖片",
    fileTooLarge: "檔案不能超過 5 MB",
  },
  auth: {
    invalidCredentials: "帳號或密碼錯誤",
    defaultWorkspaceNotFound: "未找到預設工作空間",
    emailAlreadyRegistered: "電子郵件已註冊",
    tooManyRequests: "請求過於頻繁，請稍後再試",
    wechatLoginFailed: "WeChat 登入失敗",
    wechatPhoneFailed: "取得手機號碼失敗",
  },
  user: {
    notFound: "使用者不存在",
    emailInUse: "電子郵件已被使用",
  },
  workspace: {
    notFound: "工作空間不存在",
    notFoundDesc: "不存在，或您沒有存取權限。",
    onlyOwnerCanUpdate: "僅建立者可修改",
    onlyOwnerCanDelete: "僅建立者可刪除",
    slugExists: "Slug 已存在",
  },
  admin: {
    cannotModifySelf: "不能修改自己的角色",
    cannotChangeOwnRole: "不能修改自己的角色",
    cannotDeleteSelf: "不能刪除自己的帳戶",
    cannotDeleteSuperadmin: "不能刪除超級管理員帳戶",
    cannotResetOwnPassword: "請使用個人設定修改密碼",
    usePersonalSettings: "請使用個人設定修改密碼",
    userNotFound: "使用者不存在",
    emailAlreadyRegistered: "電子郵件已被註冊",
    invalidInvitationCode: "邀請碼無效",
    invitationCodeExpired: "邀請碼已過期",
    defaultWorkspaceDesc: "的預設工作空間",
    workspaceSuffix: "的工作空間",
  },
};

export default errors;
