import { describe, expect, it } from 'vitest'
import { generateRecipeSuggestions, ingredientsToShoppingItems, vegetarianCoverageOk } from '../src/lib/recipes'
import type { Recipe, RecipeIngredient } from '../src/types'

const recipe = (id: string, isVegetarian: boolean): Recipe => ({
  id,
  family_id: 'family',
  title: id,
  description: 'Test',
  source_type: 'seed',
  source_url: null,
  is_vegetarian: isVegetarian,
  difficulty: 'leicht',
  prep_minutes: 10,
  cook_minutes: 20,
  servings: 4,
  tags: [],
  visibility: 'family',
  status: 'active',
  created_by: null,
})

describe('Rezeptvorschlaege', () => {
  it('enthaelt mindestens zwei vegetarische Vorschlaege, wenn genug Rezepte vorhanden sind', () => {
    const suggestions = generateRecipeSuggestions([
      recipe('veg-1', true),
      recipe('veg-2', true),
      recipe('meat-1', false),
      recipe('meat-2', false),
      recipe('veg-3', true),
    ])

    expect(vegetarianCoverageOk(suggestions)).toBe(true)
    expect(suggestions).toHaveLength(5)
  })

  it('uebernimmt nicht-optionale Zutaten in eine Einkaufsliste', () => {
    const ingredients: RecipeIngredient[] = [
      {
        id: 'i1',
        recipe_id: 'veg-1',
        name: 'Kartoffeln',
        quantity: '1',
        unit: 'kg',
        note: null,
        shopping_category: 'Gemuese',
        optional: false,
        sort_order: 1,
      },
      {
        id: 'i2',
        recipe_id: 'veg-1',
        name: 'Petersilie',
        quantity: '1',
        unit: 'Bund',
        note: null,
        shopping_category: 'Kraeuter',
        optional: true,
        sort_order: 2,
      },
    ]

    const items = ingredientsToShoppingItems({ ...recipe('veg-1', true), ingredients }, 'list')
    expect(items).toHaveLength(1)
    expect(items[0]?.title).toBe('Kartoffeln')
  })
})
