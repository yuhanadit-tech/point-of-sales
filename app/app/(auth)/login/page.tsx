'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(data: LoginFormData) {
    setServerError(null)
    const result = await signIn('credentials', {
      email: data.email,
      password: data.password,
      redirect: false,
    })

    if (result?.error) {
      setServerError('Invalid email or password')
      return
    }

    router.push('/pos')
    router.refresh()
  }

  return (
    <div className="w-full max-w-sm">
      {/* Card */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center mb-4">
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 3h2l.4 2M7 13h10l4-4H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-neutral-900">POS MVP</h1>
          <p className="text-sm text-neutral-500 mt-1">Sign in to continue</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          {/* Server error */}
          {serverError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {serverError}
            </div>
          )}

          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-neutral-700 mb-1.5"
            >
              Email
            </label>
            <input
              {...register('email')}
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              className={`w-full rounded-lg border px-3 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 outline-none transition-colors
                focus:ring-2 focus:ring-primary/20 focus:border-primary
                disabled:opacity-50 disabled:cursor-not-allowed
                ${errors.email ? 'border-red-400 bg-red-50' : 'border-neutral-300 bg-white'}`}
              placeholder="admin@pos.local"
              disabled={isSubmitting}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-neutral-700 mb-1.5"
            >
              Password
            </label>
            <input
              {...register('password')}
              id="password"
              type="password"
              autoComplete="current-password"
              className={`w-full rounded-lg border px-3 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 outline-none transition-colors
                focus:ring-2 focus:ring-primary/20 focus:border-primary
                disabled:opacity-50 disabled:cursor-not-allowed
                ${errors.password ? 'border-red-400 bg-red-50' : 'border-neutral-300 bg-white'}`}
              placeholder="••••••••"
              disabled={isSubmitting}
            />
            {errors.password && (
              <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white
              hover:bg-primary-hover active:scale-[0.99] transition-all
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
              disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
          >
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        {/* Hint for local dev */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-6 pt-6 border-t border-neutral-100">
            <p className="text-xs text-neutral-400 font-medium mb-2">Dev credentials</p>
            <div className="space-y-1 text-xs text-neutral-500 font-mono">
              <div>admin@pos.local / admin123</div>
              <div>cashier@pos.local / cashier123</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
