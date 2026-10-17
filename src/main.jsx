import React, { lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { LazyMotion, domAnimation } from 'motion/react'
import './styles.css'
import './reference.css'
import './design-system.css'
import './brand-theme.css'

const App = lazy(() => import('./App.jsx'))

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LazyMotion features={domAnimation}>
      <Suspense fallback={<main className="app-loading" role="status">Carregando InPETU Connect...</main>}>
        <App />
      </Suspense>
    </LazyMotion>
  </React.StrictMode>,
)
