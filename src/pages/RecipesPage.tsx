import { useState } from 'react'
import { Check, ChefHat, ShoppingCart } from 'lucide-react'
import { generateRecipeSuggestions, vegetarianCoverageOk } from '../lib/recipes'
import { useFamilyRoute } from '../routes/context'
import { Button, Card, EmptyState, Tag } from '../components/ui'

export const RecipesPage = () => {
  const { data, actions } = useFamilyRoute()
  const [addedRecipeId, setAddedRecipeId] = useState<string | null>(null)
  const list = data.shoppingLists[0]
  const suggestedRecipeIds = data.recipeSuggestions.map((suggestion) => suggestion.recipe_id)
  const activeRecipes = data.recipes.filter((recipe) => recipe.status !== 'archived')
  const archivedRecipes = data.recipes.filter((recipe) => recipe.status === 'archived')
  const suggestions =
    data.recipeSuggestions.length > 0
      ? activeRecipes.filter((recipe) => suggestedRecipeIds.includes(recipe.id))
      : generateRecipeSuggestions(activeRecipes)
  const coverageOk = vegetarianCoverageOk(suggestions)

  return (
    <div className="page-stack">
      <section className="page-title">
        <div>
          <h1>Rezepte</h1>
          <p>Lokale Seed-Vorschläge ohne fremde Rezeptvolltexte oder kostenpflichtige Dienste.</p>
        </div>
        <Tag tone={coverageOk ? 'good' : 'warn'}>{coverageOk ? 'mind. 2 vegetarisch' : 'vegetarische Quote prüfen'}</Tag>
      </section>

      <div className="recipe-grid">
        {suggestions.map((recipe) => {
          const ingredients = data.recipeIngredients.filter((ingredient) => ingredient.recipe_id === recipe.id)
          const wasAdded = addedRecipeId === recipe.id
          const addRecipe = async () => {
            if (!list) {
              return
            }
            await actions.addRecipeToShoppingList(list.id, recipe.id)
            setAddedRecipeId(recipe.id)
            window.setTimeout(() => setAddedRecipeId(null), 1600)
          }

          return (
            <Card key={recipe.id}>
              <article className={`recipe-card ${wasAdded ? 'recipe-card-added' : ''}`}>
                <div className="recipe-icon">
                  {wasAdded ? <Check size={24} /> : <ChefHat size={24} />}
                </div>
                <div>
                  <h2>{recipe.title}</h2>
                  <p>{recipe.description}</p>
                  <div className="tag-row">
                    <Tag tone={recipe.is_vegetarian ? 'good' : 'neutral'}>{recipe.is_vegetarian ? 'vegetarisch' : 'nicht vegetarisch'}</Tag>
                    <Tag>{recipe.difficulty}</Tag>
                    <Tag>{recipe.prep_minutes + recipe.cook_minutes} Min.</Tag>
                  </div>
                </div>
                <ul>
                  {ingredients.slice(0, 5).map((ingredient) => (
                    <li key={ingredient.id}>
                      {ingredient.name} <span>{ingredient.quantity} {ingredient.unit}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  variant="secondary"
                  disabled={!list}
                  onClick={() => void addRecipe()}
                >
                  {wasAdded ? <Check size={18} /> : <ShoppingCart size={18} />}
                  {wasAdded ? 'Übernommen' : 'Zutaten in Einkauf'}
                </Button>
                <Button variant="ghost" onClick={() => void actions.archiveRecipe(recipe.id, true)}>
                  Archivieren
                </Button>
                {wasAdded && <div className="recipe-feedback">Zutaten wurden in den Einkauf übernommen.</div>}
              </article>
            </Card>
          )
        })}
        {!suggestions.length && <EmptyState title="Keine Rezepte" body="Seed-Daten müssen erst in Supabase geladen werden." />}
      </div>
      {archivedRecipes.length > 0 && (
        <Card title="Rezept-Archiv">
          <div className="compact-list">
            {archivedRecipes.map((recipe) => (
              <article key={recipe.id}>
                <strong>{recipe.title}</strong>
                <button type="button" onClick={() => void actions.archiveRecipe(recipe.id, false)}>Zurückholen</button>
              </article>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
