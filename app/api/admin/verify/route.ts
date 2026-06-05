import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const pass = req.headers.get('x-admin-pass')
  if (pass === process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ ok: true })
  }
  return NextResponse.json({ ok: false }, { status: 401 })
}
