import '../styles/globals.css'
import Layout from '../components/Layout'
import ErrorBoundary from '../components/ErrorBoundary'
import { AuthProvider } from '../lib/useAuth'
import { QueryClient, QueryClientProvider } from 'react-query'
import { useState, useEffect } from 'react'

export default function App({ Component, pageProps }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  }))

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Layout>
            <Component {...pageProps} />
          </Layout>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}