const errors = {
  common: {
    unauthorized: "Nicht angemeldet",
    forbidden: "Kein Zugriff",
    adminRequired: "Admin-Rechte erforderlich",
    superadminRequired: "Super-Admin-Rechte erforderlich",
    requestFailed: "Anfrage fehlgeschlagen",
    missingWorkspace: "Workspace-Parameter fehlt",
    workspaceForbidden: "Kein Zugriff auf diesen Workspace",
    invalidFileType: "Nur JPEG-, PNG-, WebP- und GIF-Bilder erlaubt",
    fileTooLarge: "Datei zu groß (max. 5 MB)",
  },
  auth: {
    invalidCredentials: "Ungültige E-Mail oder Passwort",
    defaultWorkspaceNotFound: "Standard-Workspace nicht gefunden",
    emailAlreadyRegistered: "E-Mail bereits registriert",
    tooManyRequests: "Zu viele Anfragen, bitte versuchen Sie es später erneut",
    wechatLoginFailed: "WeChat-Anmeldung fehlgeschlagen",
    wechatPhoneFailed: "Telefonnummer konnte nicht abgerufen werden",
  },
  user: {
    notFound: "Benutzer nicht gefunden",
    emailInUse: "E-Mail bereits vergeben",
  },
  workspace: {
    notFound: "Workspace nicht gefunden",
    notFoundDesc: "existiert nicht oder Sie haben keinen Zugriff.",
    onlyOwnerCanUpdate: "Nur der Eigentümer kann aktualisieren",
    onlyOwnerCanDelete: "Nur der Eigentümer kann löschen",
    slugExists: "Kennung bereits vorhanden",
  },
  admin: {
    cannotModifySelf: "Eigene Rolle kann nicht geändert werden",
    cannotChangeOwnRole: "Eigene Rolle kann nicht geändert werden",
    cannotDeleteSelf: "Eigenes Konto kann nicht gelöscht werden",
    cannotDeleteSuperadmin: "Super-Admin-Konto kann nicht gelöscht werden",
    cannotResetOwnPassword: "Bitte verwenden Sie die Profileinstellungen",
    usePersonalSettings: "Bitte verwenden Sie die Profileinstellungen",
    userNotFound: "Benutzer nicht gefunden",
    emailAlreadyRegistered: "E-Mail bereits registriert",
    invalidInvitationCode: "Ungültiger Einladungscode",
    invitationCodeExpired: "Einladungscode abgelaufen",
    defaultWorkspaceDesc: "s Standard-Workspace",
    workspaceSuffix: "s Workspace",
  },
};

export default errors;
