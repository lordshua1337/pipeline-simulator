import { NextResponse } from 'next/server'
import { getUser } from '@/lib/auth/server'

export async function GET() {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ user: null })
  }
  return NextResponse.json({
    user: { id: user.id, email: user.email },
  })
}
