import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import './index.css'
import { startAutosave } from './persistence/autosave'

// Antes do primeiro render, para o canvas já abrir enquadrando o projeto restaurado.
startAutosave()

const root = document.getElementById('root')
if (!root) throw new Error('Elemento #root não encontrado')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
