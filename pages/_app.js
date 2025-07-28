import { SessionProvider } from 'next-auth/react'
import { ThemeProvider } from 'next-themes'
import { QueryClient, QueryClientProvider } from 'react-query'
import { AuthProvider } from '../lib/useAuth'
import { useState } from 'react'
import '../styles/globals.css'
import Layout from '../components/Layout'
import ErrorBoundary from '../components/ErrorBoundary'

export default function App({ 
  Component, 
  pageProps: { session, ...pageProps } 
}) {
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
      <SessionProvider session={session}>
        <ThemeProvider 
          attribute="class" 
          defaultTheme="system" 
          enableSystem={true}
          disableTransitionOnChange={false}
        >
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <Layout>
                <Component {...pageProps} />
              </Layout>
            </AuthProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </SessionProvider>
    </ErrorBoundary>
  )
}