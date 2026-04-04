const errors = {
  common: {
    unauthorized: "Not logged in",
    forbidden: "No permission to access",
    adminRequired: "Admin privileges required",
    superadminRequired: "Super admin privileges required",
    requestFailed: "Request failed",
    missingWorkspace: "Missing workspace parameter",
    workspaceForbidden: "No permission to access this workspace",
    invalidFileType: "Only JPEG, PNG, WebP and GIF images are allowed",
    fileTooLarge: "File too large (max 5 MB)",
  },
  auth: {
    invalidCredentials: "Invalid email or password",
    defaultWorkspaceNotFound: "Default workspace not found",
    emailAlreadyRegistered: "Email already registered",
    tooManyRequests: "Too many requests, please try again later",
    wechatLoginFailed: "WeChat login failed",
    wechatPhoneFailed: "Failed to get phone number",
  },
  user: {
    notFound: "User not found",
    emailInUse: "Email already in use",
  },
  workspace: {
    notFound: "Workspace not found",
    notFoundDesc: "does not exist or you don't have access to it.",
    onlyOwnerCanUpdate: "Only the owner can update",
    onlyOwnerCanDelete: "Only the owner can delete",
    slugExists: "Slug already exists",
  },
  admin: {
    cannotModifySelf: "Cannot modify your own role",
    cannotChangeOwnRole: "Cannot change your own role",
    cannotDeleteSelf: "Cannot delete your own account",
    cannotDeleteSuperadmin: "Cannot delete super admin account",
    cannotResetOwnPassword: "Please use profile settings to change password",
    usePersonalSettings: "Please use profile settings to change password",
    userNotFound: "User not found",
    emailAlreadyRegistered: "Email already registered",
    invalidInvitationCode: "Invalid invitation code",
    invitationCodeExpired: "Invitation code has expired",
    defaultWorkspaceDesc: "'s default workspace",
    workspaceSuffix: "'s workspace",
  },
};

export default errors;
