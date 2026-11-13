/**
 * Categorias da biblioteca de componentes (docs/PLANO.md, seção 5).
 * As categorias "em breve" aparecem desativadas para mostrar a organização final da biblioteca.
 */

export type CategoryId = 'doors' | 'windows' | 'bathroom' | 'kitchen' | 'furniture' | 'appliances'

export interface Category {
  id: CategoryId
  name: string
  available: boolean
}

export const CATEGORIES: Category[] = [
  { id: 'doors', name: 'Portas', available: true },
  { id: 'windows', name: 'Janelas', available: true },
  { id: 'bathroom', name: 'Banheiro', available: false },
  { id: 'kitchen', name: 'Cozinha', available: false },
  { id: 'furniture', name: 'Móveis', available: false },
  { id: 'appliances', name: 'Eletrodomésticos', available: false },
]
