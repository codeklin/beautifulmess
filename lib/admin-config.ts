export function getAdminConfig() {
  const adminPassword = process.env.ADMIN_PASSWORD
  const siteUrl = process.env.SITE_URL

  if (!adminPassword || adminPassword.length < 24 || !siteUrl) {
    return null
  }

  try {
    const parsedSiteUrl = new URL(siteUrl)
    if (parsedSiteUrl.protocol !== 'https:' && parsedSiteUrl.hostname !== 'localhost') {
      return null
    }

    return {
      adminPassword,
      siteUrl: parsedSiteUrl.origin,
    }
  } catch {
    return null
  }
}
