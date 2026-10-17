import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles.css'
import './reference.css'
import './design-system.css'
import './brand-theme.css'

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>)
