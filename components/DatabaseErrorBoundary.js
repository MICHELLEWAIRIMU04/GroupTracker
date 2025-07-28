import { useState } from 'react'
import axios from 'axios'

export default function DatabaseErrorBoundary({ error, onRetry, children }) {
  const [checking, setChecking] = useState(false)
  const [healthStatus, setHealthStatus] = useState(null)

  const checkHealth = async () => {
    setChecking(true)
    try {
      const response = await axios.get('/api/health')
      setHealthStatus(response.data)
    } catch (error) {
      setHealthStatus({
        status: 'error',
        error: error.response?.data?.message || 'Health check failed'
      })
    } finally {
      setChecking(false)
    }
  }

  const isDatabaseError = error?.response?.data?.error === 'DATABASE_CONNECTION_ERROR' || 
                         error?.message?.includes("Can't reach database server")

  if (isDatabaseError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-md w-full">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border dark:border-gray-700">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Database Connection Issue
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Temporary connection problem
                </p>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                We're having trouble connecting to the database. This is usually temporary and resolves quickly.
              </p>
              
              {healthStatus && (
                <div className={`p-3 rounded-md mb-4 ${
                  healthStatus.status === 'healthy' 
                    ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                    : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                }`}>
                  <p className={`text-sm ${
                    healthStatus.status === 'healthy' 
                      ? 'text-green-800 dark:text-green-200' 
                      : 'text-red-800 dark:text-red-200'
                  }`}>
                    Status: {healthStatus.status === 'healthy' ? '✅ Connected' : '❌ Disconnected'}
                    {healthStatus.database?.responseTime && ` (${healthStatus.database.responseTime})`}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex space-x-3">
                <button
                  onClick={onRetry}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={checkHealth}
                  disabled={checking}
                  className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-300 px-4 py-2 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                >
                  {checking ? 'Checking...' : 'Check Status'}
                </button>
              </div>
              
              <button
                onClick={() => window.location.href = '/'}
                className="w-full text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 text-sm"
              >
                Go to Homepage
              </button>
            </div>

            <div className="mt-6 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md">
              <p className="text-xs text-gray-600 dark:text-gray-400">
                <strong>What you can try:</strong>
              </p>
              <ul className="text-xs text-gray-600 dark:text-gray-400 mt-1 space-y-1">
                <li>• Wait a few seconds and try again</li>
                <li>• Check your internet connection</li>
                <li>• Refresh the page</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return children
}