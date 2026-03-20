'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Landmark, LockKeyhole, UserRound } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { users } from '@/lib/mock-data'

const demoPassword = 'worker123'

export default function WorkerLoginPage() {
  const router = useRouter()
  const workerUser = useMemo(() => users.find((user) => user.role === 'worker'), [])
  const [email, setEmail] = useState(workerUser?.email ?? '')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    const isValid = email.trim().toLowerCase() === workerUser?.email && password === demoPassword

    window.setTimeout(() => {
      if (!isValid) {
        setIsSubmitting(false)
        setError('Invalid worker credentials. Please check your email and password.')
        return
      }

      router.push('/worker')
    }, 700)
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#eef5ff_55%,#f8fafc_100%)]">
      <div className="border-b border-sky-900/20 bg-slate-950 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2 text-xs sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <Landmark className="h-3.5 w-3.5 text-amber-300" />
            <span>Municipal Civic Services Portal</span>
          </div>
          <div className="text-slate-300">Authorized worker access only</div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8 lg:py-20">
        <div className="max-w-xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-4 py-2 text-sm text-sky-800 shadow-sm">
            <LockKeyhole className="h-4 w-4" />
            Worker sign-in
          </div>
          <h1 className="mt-6 text-5xl font-semibold tracking-tight text-slate-950">
            Secure access for field workers.
          </h1>
          <p className="mt-6 text-lg leading-8 text-slate-600">
            This login is separated from the citizen portal so the public homepage stays simple
            and easy to use. Workers can sign in here to access assignments and update field work.
          </p>

          <div className="mt-10 space-y-4">
            {[
              'Dedicated worker entry from the navbar',
              'Simple sign-in form with a clean government-friendly layout',
              'Fast access to field assignments and work updates',
            ].map((item) => (
              <div
                key={item}
                className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-slate-700 shadow-sm"
              >
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                {item}
              </div>
            ))}
          </div>
        </div>

        <Card className="mx-auto w-full max-w-xl rounded-[2rem] border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
          <CardHeader>
            <CardDescription>Worker access portal</CardDescription>
            <CardTitle className="text-3xl">Login to continue</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Worker Email</Label>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="h-11 pl-10"
                    placeholder="name@department.gov"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="h-11 pl-10"
                    placeholder="Enter your password"
                    required
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                Demo worker credentials:
                <div className="mt-2 font-medium">Email: {workerUser?.email}</div>
                <div className="font-medium">Password: {demoPassword}</div>
              </div>

              {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              <Button
                type="submit"
                className="h-12 w-full rounded-full bg-slate-950 text-white hover:bg-slate-800"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Signing in...' : 'Login as Worker'}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="h-12 w-full rounded-full border-slate-300 bg-white"
                onClick={() => router.push('/')}
              >
                Back to Citizen Homepage
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
