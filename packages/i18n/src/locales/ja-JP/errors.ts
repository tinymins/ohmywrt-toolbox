const errors = {
  common: {
    unauthorized: "未ログイン",
    forbidden: "アクセス権限がありません",
    adminRequired: "管理者権限が必要です",
    superadminRequired: "スーパー管理者権限が必要です",
    requestFailed: "リクエスト失敗",
    missingWorkspace: "ワークスペースパラメータが不足",
    workspaceForbidden: "このワークスペースへのアクセス権限がありません",
    invalidFileType: "JPEG、PNG、WebP、GIF 形式の画像のみ対応",
    fileTooLarge: "ファイルサイズが 5 MB を超えています",
  },
  auth: {
    invalidCredentials: "メールアドレスまたはパスワードが正しくありません",
    defaultWorkspaceNotFound: "デフォルトワークスペースが見つかりません",
    emailAlreadyRegistered: "メールアドレスは既に登録されています",
    tooManyRequests:
      "リクエストが多すぎます。しばらくしてから再試行してください",
    wechatLoginFailed: "WeChatログインに失敗しました",
    wechatPhoneFailed: "電話番号の取得に失敗しました",
  },
  user: {
    notFound: "ユーザーが見つかりません",
    emailInUse: "メールアドレスは既に使用されています",
  },
  workspace: {
    notFound: "ワークスペースが見つかりません",
    notFoundDesc: "存在しないか、アクセス権限がありません。",
    onlyOwnerCanUpdate: "所有者のみ更新可能",
    onlyOwnerCanDelete: "所有者のみ削除可能",
    slugExists: "スラッグは既に存在します",
  },
  admin: {
    cannotModifySelf: "自分の役割は変更できません",
    cannotChangeOwnRole: "自分の役割は変更できません",
    cannotDeleteSelf: "自分のアカウントは削除できません",
    cannotDeleteSuperadmin: "スーパー管理者アカウントは削除できません",
    cannotResetOwnPassword: "プロフィール設定からパスワードを変更してください",
    usePersonalSettings: "プロフィール設定からパスワードを変更してください",
    userNotFound: "ユーザーが見つかりません",
    emailAlreadyRegistered: "メールアドレスは既に登録されています",
    invalidInvitationCode: "招待コードが無効です",
    invitationCodeExpired: "招待コードの有効期限が切れています",
    defaultWorkspaceDesc: "のデフォルトワークスペース",
    workspaceSuffix: "のワークスペース",
  },
};

export default errors;
