import { useState } from 'react'
import { Check, ChefHat, RefreshCw, ShoppingCart } from 'lucide-react'
import { generateRecipeSuggestions, vegetarianCoverageOk } from '../lib/recipes'
import { useFamilyRoute } from '../routes/context'
import { Button, Card, EmptyState, Tag } from '../components/ui'
import type { ActivityAgentRun } from '../types'

const formatRunLabel = (run: ActivityAgentRun | undefined) => {
  if (!run) {
    return 'Noch kein Rezeptlauf gespeichert.'
  }

  const finished = run.finished_at ? new Date(run.finished_at) : new Date(run.started_at)
  return `${finished.toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}: ${run.items_saved} Vorschläge gespeichert.`
}

export const RecipesPage = () => {
  const { data, actions } = useFamilyRoute()
  const [addedRecipeId, setAddedRecipeId] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const list = data.shoppingLists[0]
  const suggestedRecipeIds = data.recipeSuggestions.map((suggestion) => suggestion.recipe_id)
  const activeRecipes = data.recipes.filter((recipe) => recipe.status !== 'archived')
  const archivedRecipes = data.recipes.filter((recipe) => recipe.status === 'archived')
  const recipeRuns = data.activityAgentRuns.filter((run) => run.run_type === 'recipes')
  const lastRun = recipeRuns[0]
  const suggestions =
    data.recipeSuggestions.length > 0
      ? activeRecipes.filter((recipe) => suggestedRecipeIds.includes(recipe.id))
      : generateRecipeSuggestions(activeRecipes)
  const coverageOk = vegetarianCoverageOk(suggestions)
  const runRecipes = async () => {
    setRefreshing(true)
    try {
      await actions.refreshRecipes()
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div className="page-stack">
      <section className="page-title">
        <div>
          <h1>Rezepte</h1>
          <p>Wöchentliche Vorschläge aus gespeicherten Rezepten. Alte Vorschläge bleiben im Archivstatus erhalten.</p>
        </div>
        <div className="page-actions">
          <Tag tone={coverageOk ? 'good' : 'warn'}>{coverageOk ? 'mind. 2 vegetarisch' : 'vegetarische Quote prüfen'}</Tag>
          <Button variant="secondary" disabled={refreshing} onClick={() => void runRecipes()}>
            <RefreshCw size={18} />
            {refreshing ? 'Läuft...' : 'Aktualisieren'}
          </Button>
        </div>
      </section>

      <Card title="Letzter Lauf">
        <div className="compact-list">
          <article>
            <strong>{lastRun?.status === 'ok' ? 'Rezeptvorschläge aktualisiert' : lastRun?.status === 'error' ? 'Fehler im Lauf' : 'Rezept-Agent'}</strong>
            <span>{formatRunLabel(lastRun)}</span>
          </article>
        </div>
      </Card>

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
