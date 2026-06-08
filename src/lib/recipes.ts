import type { Recipe, RecipeIngredient } from '../types'

export interface RecipeWithIngredients extends Recipe {
  ingredients: RecipeIngredient[]
}

export const getWeekKey = (date = new Date()) => {
  const copy = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = copy.getUTCDay() || 7
  copy.setUTCDate(copy.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(copy.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((copy.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${copy.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

export const generateRecipeSuggestions = (recipes: Recipe[], count = 5) => {
  const active = recipes.filter((recipe) => recipe.status === 'active')
  const vegetarian = active.filter((recipe) => recipe.is_vegetarian)
  const nonVegetarian = active.filter((recipe) => !recipe.is_vegetarian)

  const selected = [...vegetarian.slice(0, 2), ...nonVegetarian.slice(0, Math.max(0, count - 2))]

  if (selected.length < count) {
    const remaining = active.filter((recipe) => !selected.some((entry) => entry.id === recipe.id))
    selected.push(...remaining.slice(0, count - selected.length))
  }

  return selected.slice(0, count)
}

export const ingredientsToShoppingItems = (recipe: RecipeWithIngredients, listId: string) =>
  recipe.ingredients
    .filter((ingredient) => !ingredient.optional)
    .map((ingredient, index) => ({
      list_id: listId,
      title: ingredient.name,
      quantity: ingredient.quantity,
      unit: ingredient.unit,
      category: ingredient.shopping_category,
      checked: false,
      sort_order: index + 1,
    }))

export const vegetarianCoverageOk = (recipes: Recipe[], minimum = 2) =>
  recipes.filter((recipe) => recipe.is_vegetarian).length >= minimum
