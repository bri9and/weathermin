import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import './index.css'
import App from './App.jsx'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      appearance={{
        baseTheme: undefined,
        variables: {
          colorPrimary: '#0ea5e9',
        },
        elements: {
          formButtonPrimary: 'bg-sky-500 hover:bg-sky-600',
          footerActionLink: 'text-sky-500 hover:text-sky-400',
        }
      }}
    >
      <App />
    </ClerkProvider>
  </StrictMode>,
)
