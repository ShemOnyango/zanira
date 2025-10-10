import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { authAPI } from '../../lib/api'
import toast from 'react-hot-toast'

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState(null)

  useEffect(() => {
    if (!token) {
      setStatus({ success: false, message: 'No verification token provided' })
      return
    }

    const verify = async () => {
      setLoading(true)
      try {
        const { data } = await authAPI.verifyEmail(token)
        setStatus({ success: true, message: data.message || 'Email verified successfully' })
        toast.success('Email verified!')
        setTimeout(() => navigate('/login'), 1500)
      } catch (err) {
        const msg = err.response?.data?.error || 'Verification failed'
        setStatus({ success: false, message: msg })
        toast.error(msg)
      } finally {
        setLoading(false)
      }
    }

    verify()
  }, [token, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50 py-20 px-4">
      <div className="max-w-xl w-full">
        <div className="bg-white rounded-2xl shadow-soft-lg p-8 text-center">
          {loading ? (
            <p className="text-lg">Verifying...</p>
          ) : status ? (
            <>
              <h2 className={`text-2xl font-bold ${status.success ? 'text-green-600' : 'text-red-600'}`}>
                {status.success ? 'Email Verified' : 'Verification Failed'}
              </h2>
              <p className="mt-4 text-gray-600">{status.message}</p>

              {!status.success && (
                <ResendForm />
              )}
            </>
          ) : (
            <p className="text-lg">Preparing verification...</p>
          )}
        </div>
      </div>
    </div>
  )
}

function ResendForm() {
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)

  const handleResend = async (e) => {
    e.preventDefault()
    if (!email) return
    setSending(true)
    try {
      await authAPI.resendVerification(email)
      toast.success('Verification email sent')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send verification')
    } finally {
      setSending(false)
    }
  }

  return (
    <form onSubmit={handleResend} className="mt-6">
      <p className="text-sm text-gray-600">Token invalid or expired? Enter your email to resend the verification link.</p>
      <div className="mt-4 flex gap-2">
        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 px-4 py-2 border rounded"
          required
        />
        <button type="submit" className="px-4 py-2 bg-teal-600 text-white rounded" disabled={sending}>
          {sending ? 'Sending...' : 'Resend'}
        </button>
      </div>
    </form>
  )
}
