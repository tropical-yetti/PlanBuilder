import { CATEGORIES, type CategoryId } from './categories'
import { doorOpenPassage } from './components/doors/open-passage'
import { doorSliding } from './components/doors/sliding'
import { doorSwingDouble } from './components/doors/swing-double'
import { doorSwingSingle } from './components/doors/swing-single'
import { windowCasement } from './components/windows/casement'
import { windowFixed } from './components/windows/fixed'
import { windowSliding } from './components/windows/sliding'
import { windowTilt } from './components/windows/tilt'
import type { ComponentDef } from './types'

/** Todos os componentes, na ordem em que aparecem na biblioteca. Componentes novos entram aqui. */
export const COMPONENTS: ComponentDef[] = [
  doorSwingSingle,
  doorSwingDouble,
  doorSliding,
  doorOpenPassage,
  windowSliding,
  windowCasement,
  windowTilt,
  windowFixed,
]

const byId = new Map(COMPONENTS.map((c) => [c.id, c]))

/** Usado quando um projeto traz um componente que esta versão do app não conhece. */
export const UNKNOWN_COMPONENT: ComponentDef = {
  ...doorOpenPassage,
  id: 'unknown',
  name: 'Componente desconhecido',
  tags: [],
  presets: undefined,
}

export const getComponent = (id: string): ComponentDef => byId.get(id) ?? UNKNOWN_COMPONENT
export const hasComponent = (id: string): boolean => byId.has(id)
export const listByCategory = (category: CategoryId): ComponentDef[] => COMPONENTS.filter((c) => c.category === category)

/** Minúsculas e sem acentos, para a busca ("vao" encontra "Vão livre"). */
export const normalizeText = (s: string): string =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()

/** Busca por nome, palavras-chave e nome da categoria. Todas as palavras digitadas precisam aparecer. */
export function searchComponents(query: string): ComponentDef[] {
  const words = normalizeText(query).split(/\s+/).filter(Boolean)
  if (words.length === 0) return COMPONENTS
  return COMPONENTS.filter((c) => {
    const cat = CATEGORIES.find((k) => k.id === c.category)?.name ?? ''
    const hay = normalizeText([c.name, cat, ...c.tags].join(' '))
    return words.every((w) => hay.includes(w))
  })
}
