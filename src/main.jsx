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
          colorBackground: '#1e293b',
          colorText: '#f1f5f9',
          colorInputBackground: '#334155',
          colorInputText: '#f1f5f9',
        },
        elements: {
          formButtonPrimary: 'bg-sky-500 hover:bg-sky-600',
          card: 'bg-slate-800 border border-slate-700',
          headerTitle: 'text-white',
          headerSubtitle: 'text-slate-400',
          socialButtonsBlockButton: 'bg-slate-700 border-slate-600 hover:bg-slate-600',
          socialButtonsBlockButtonText: 'text-white',
          formFieldLabel: 'text-slate-300',
          formFieldInput: 'bg-slate-700 border-slate-600 text-white',
          footerActionLink: 'text-sky-400 hover:text-sky-300',
        }
      }}
    >
      <App />
    </ClerkProvider>
  </StrictMode>,
)
