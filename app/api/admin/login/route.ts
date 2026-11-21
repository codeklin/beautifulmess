import { createHash, timingSafeEqual } from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { getAdminConfig } from '@/lib/admin-config'
import { ADMIN_SESSION_COOKIE, ADMIN_SESSION_SECONDS, createAdminSession } from '@/lib/admin-session'

export async function POST(request: NextRequest) {
  const adminConfig = getAdminConfig()
  if (!adminConfig) {
    return NextResponse.json(
      { message: 'Writing access is not configured yet.' },
      { status: 503 },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ message: 'Enter your password.' }, { status: 400 })
    }
    throw error
  }

  if (
    typeof body !== 'object' ||
    body === null ||
    !('password' in body) ||
    typeof body.password !== 'string' ||
    body.password.length > 1024
  ) {
    return NextResponse.json({ message: 'Enter your password.' }, { status: 400 })
  }

  const submittedHash = createHash('sha256').update(body.password).digest()
  const expectedHash = createHash('sha256').update(adminConfig.adminPassword).digest()
  if (!timingSafeEqual(submittedHash, expectedHash)) {
    return NextResponse.json({ message: 'That password is not correct.' }, { status: 401 })
  }

  const response = NextResponse.json({ message: 'You are signed in.' })
  response.headers.set('Cache-Control', 'no-store')
  response.cookies.set(
    ADMIN_SESSION_COOKIE,
    await createAdminSession(adminConfig.adminPassword),
    {
      httpOnly: true,
      secure: new URL(request.url).protocol === 'https:',
      sameSite: 'strict',
      path: '/',
      maxAge: ADMIN_SESSION_SECONDS,
    },
  )
  return response
}
