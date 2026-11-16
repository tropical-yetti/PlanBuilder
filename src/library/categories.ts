/**
 * Categorias da biblioteca de componentes (docs/PLANO.md, seção 5).
 * As categorias "em breve" aparecem desativadas para mostrar a organização final da biblioteca.
 */

export type CategoryId = 'doors' | 'windows' | 'cobogo' | 'furniture' | 'kitchen' | 'appliances' | 'floors' | 'bathroom'

export interface Category {
  id: CategoryId
  name: string
  available: boolean
}

export const CATEGORIES: Category[] = [
  { id: 'doors', name: 'Portas', available: true },
  { id: 'windows', name: 'Janelas', available: true },
  { id: 'cobogo', name: 'Cobogós', available: true },
  { id: 'furniture', name: 'Móveis', available: true },
  { id: 'kitchen', name: 'Cozinha e lavanderia', available: true },
  { id: 'appliances', name: 'Eletrodomésticos', available: true },
  { id: 'bathroom', name: 'Banheiro', available: true },
  { id: 'floors', name: 'Pisos', available: true },
]
