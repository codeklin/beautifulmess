import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  let databaseActive = false

  // If Supabase credentials are configured, perform a lightweight check to record inbound API traffic
  if (supabaseUrl && supabaseKey) {
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/writings?select=id&limit=1`, {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
        cache: 'no-store',
      })
      databaseActive = response.ok
    } catch {
      databaseActive = false
    }
  }

  return NextResponse.json({
    status: 'ok',
    databaseActive,
    timestamp: new Date().toISOString(),
  })
}
