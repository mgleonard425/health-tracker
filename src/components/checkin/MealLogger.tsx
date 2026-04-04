import { useState, useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Search, Star, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { db, getFavoriteMeals } from '@/db'
import { cn } from '@/lib/utils'
import type { MealLog, MealTimeOfDay, MealSource, FavoriteMeal } from '@/db'

interface MealLoggerProps {
  date: string
}

const timeSlots: { value: MealTimeOfDay; label: string }[] = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
  { value: 'pre-workout', label: 'Pre-Workout' },
  { value: 'post-workout', label: 'Post-Workout' },
]

const sourceOptions: { value: MealSource; label: string }[] = [
  { value: 'home-cooked', label: 'Home' },
  { value: 'work-cafeteria', label: 'Work' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'takeout', label: 'Takeout' },
]

interface NutritionResult {
  name: string
  calories: number
  protein_g: number
  carbohydrates_total_g: number
  fat_total_g: number
}

export function MealLogger({ date }: MealLoggerProps) {
  const meals = useLiveQuery(() => db.mealLogs.where('date').equals(date).toArray(), [date])
  const favorites = useLiveQuery(() => getFavoriteMeals(), [])

  const [addingMeal, setAddingMeal] = useState(false)
  const [selectedTime, setSelectedTime] = useState<MealTimeOfDay>('breakfast')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<NutritionResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedSource, setSelectedSource] = useState<MealSource>('home-cooked')
  const [manualEntry, setManualEntry] = useState(false)
  const [description, setDescription] = useState('')
  const [calories, setCalories] = useState<number | undefined>()
  const [protein, setProtein] = useState<number | undefined>()
  const [carbs, setCarbs] = useState<number | undefined>()
  const [fat, setFat] = useState<number | undefined>()

  const totalCalories = meals?.reduce((sum, m) => sum + (m.calories || 0), 0) || 0
  const totalProtein = meals?.reduce((sum, m) => sum + (m.proteinG || 0), 0) || 0

  const searchFood = useCallback(async (query: string) => {
    const apiKey = localStorage.getItem('calorieninjas_api_key')
    if (!apiKey || !query.trim()) {
      setSearchResults([])
      return
    }

    setSearching(true)
    try {
      const response = await fetch(
        `https://api.calorieninjas.com/v1/nutrition?query=${encodeURIComponent(query)}`,
        { headers: { 'X-Api-Key': apiKey } }
      )
      const data = await response.json()
      setSearchResults(data.items || [])
    } catch {
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }, [])

  const handleSearch = useCallback(() => {
    if (searchQuery.trim()) {
      searchFood(searchQuery)
    }
  }, [searchQuery, searchFood])

  async function handleSelectResult(result: NutritionResult) {
    await db.mealLogs.add({
      date,
      timeOfDay: selectedTime,
      description: result.name,
      source: selectedSource,
      calories: Math.round(result.calories),
      proteinG: Math.round(result.protein_g),
      carbsG: Math.round(result.carbohydrates_total_g),
      fatG: Math.round(result.fat_total_g),
    })
    resetForm()
  }

  async function handleSelectFavorite(fav: FavoriteMeal) {
    await db.mealLogs.add({
      date,
      timeOfDay: selectedTime,
      description: fav.name,
      source: fav.source,
      calories: fav.calories,
      proteinG: fav.proteinG,
      carbsG: fav.carbsG,
      fatG: fav.fatG,
    })
    await db.favoriteMeals.update(fav.id!, { usageCount: fav.usageCount + 1 })
    resetForm()
  }

  async function handleSaveManual() {
    if (!description.trim()) return
    await db.mealLogs.add({
      date,
      timeOfDay: selectedTime,
      description: description.trim(),
      source: selectedSource,
      calories,
      proteinG: protein,
      carbsG: carbs,
      fatG: fat,
    })
    resetForm()
  }

  async function handleSaveAsFavorite(meal: MealLog) {
    await db.favoriteMeals.add({
      name: meal.description,
      calories: meal.calories,
      proteinG: meal.proteinG,
      carbsG: meal.carbsG,
      fatG: meal.fatG,
      source: meal.source,
      usageCount: 1,
    })
  }

  async function handleDeleteMeal(id: number) {
    await db.mealLogs.delete(id)
  }

  function resetForm() {
    setAddingMeal(false)
    setSearchQuery('')
    setSearchResults([])
    setManualEntry(false)
    setDescription('')
    setCalories(undefined)
    setProtein(undefined)
    setCarbs(undefined)
    setFat(undefined)
  }

  const hasApiKey = !!localStorage.getItem('calorieninjas_api_key')

  return (
    <div className="space-y-3">
      {/* Daily totals */}
      <div className="flex gap-4 text-sm">
        <div>
          <span className="text-muted-foreground">Calories:</span>
          <span className="font-bold ml-1">{totalCalories}</span>
          <span className="text-muted-foreground text-xs"> / 2800</span>
        </div>
        <div>
          <span className="text-muted-foreground">Protein:</span>
          <span className="font-bold ml-1">{totalProtein}g</span>
          <span className="text-muted-foreground text-xs"> / 140g</span>
        </div>
      </div>

      {/* Logged meals */}
      {meals && meals.length > 0 && (
        <div className="space-y-1">
          {meals.map(meal => (
            <div key={meal.id} className="flex items-center justify-between bg-secondary rounded-lg px-3 py-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs shrink-0">{meal.timeOfDay}</Badge>
                  <span className="text-sm truncate">{meal.description}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {meal.calories && `${meal.calories} cal`}
                  {meal.proteinG && ` · ${meal.proteinG}g P`}
                  {meal.carbsG && ` · ${meal.carbsG}g C`}
                  {meal.fatG && ` · ${meal.fatG}g F`}
                </div>
              </div>
              <div className="flex items-center gap-1 ml-2">
                <button
                  type="button"
                  onClick={() => handleSaveAsFavorite(meal)}
                  className="p-1 text-muted-foreground hover:text-yellow-500"
                  title="Save as favorite"
                >
                  <Star className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteMeal(meal.id!)}
                  className="p-1 text-muted-foreground hover:text-red-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add meal button or form */}
      {!addingMeal ? (
        <Button variant="outline" className="w-full" onClick={() => setAddingMeal(true)}>
          <Plus className="w-4 h-4 mr-1" /> Add Meal
        </Button>
      ) : (
        <div className="bg-secondary/50 rounded-lg p-3 space-y-3">
          {/* Time of day */}
          <div className="flex flex-wrap gap-1">
            {timeSlots.map(t => (
              <button
                key={t.value}
                type="button"
                onClick={() => setSelectedTime(t.value)}
                className={cn(
                  'px-2 py-1 rounded text-xs font-medium transition-colors touch-manipulation',
                  selectedTime === t.value ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Source */}
          <div className="flex flex-wrap gap-1">
            {sourceOptions.map(s => (
              <button
                key={s.value}
                type="button"
                onClick={() => setSelectedSource(s.value)}
                className={cn(
                  'px-2 py-1 rounded text-xs font-medium transition-colors touch-manipulation',
                  selectedSource === s.value ? 'bg-emerald-600 text-white' : 'bg-secondary text-muted-foreground'
                )}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Favorites */}
          {favorites && favorites.length > 0 && (
            <div>
              <span className="text-xs text-muted-foreground">Favorites:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {favorites.slice(0, 6).map(fav => (
                  <button
                    key={fav.id}
                    type="button"
                    onClick={() => handleSelectFavorite(fav)}
                    className="px-2 py-1 rounded bg-yellow-600/20 text-yellow-400 text-xs font-medium touch-manipulation"
                  >
                    {fav.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Search */}
          {hasApiKey && !manualEntry && (
            <div className="flex gap-2">
              <Input
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && handleSearch()}
                placeholder="Search food (e.g., lentil soup)"
                className="flex-1"
              />
              <Button size="sm" onClick={handleSearch} disabled={searching}>
                <Search className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Search results */}
          {searchResults.length > 0 && (
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {searchResults.map((result, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelectResult(result)}
                  className="w-full text-left bg-secondary rounded px-3 py-2 text-sm hover:bg-secondary/80 touch-manipulation"
                >
                  <div className="font-medium capitalize">{result.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {Math.round(result.calories)} cal · {Math.round(result.protein_g)}g P · {Math.round(result.carbohydrates_total_g)}g C · {Math.round(result.fat_total_g)}g F
                  </div>
                </button>
              ))}
            </div>
          )}

          {searching && <div className="text-xs text-muted-foreground text-center">Searching...</div>}

          {/* Manual entry toggle */}
          <button
            type="button"
            onClick={() => setManualEntry(!manualEntry)}
            className="text-xs text-muted-foreground underline"
          >
            {manualEntry ? 'Search instead' : (hasApiKey ? 'Enter manually' : 'Add meal manually')}
          </button>

          {/* Manual entry form */}
          {(manualEntry || !hasApiKey) && (
            <div className="space-y-2">
              <Input
                value={description}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDescription(e.target.value)}
                placeholder="What did you eat?"
              />
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">Cal</label>
                  <Input
                    type="number"
                    value={calories || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCalories(e.target.value ? Number(e.target.value) : undefined)}
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Protein</label>
                  <Input
                    type="number"
                    value={protein || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProtein(e.target.value ? Number(e.target.value) : undefined)}
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Carbs</label>
                  <Input
                    type="number"
                    value={carbs || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCarbs(e.target.value ? Number(e.target.value) : undefined)}
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Fat</label>
                  <Input
                    type="number"
                    value={fat || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFat(e.target.value ? Number(e.target.value) : undefined)}
                    className="text-sm"
                  />
                </div>
              </div>
              <Button size="sm" onClick={handleSaveManual} disabled={!description.trim()}>
                Add
              </Button>
            </div>
          )}

          {/* Cancel */}
          <button type="button" onClick={resetForm} className="text-xs text-muted-foreground underline block">
            Cancel
          </button>

          {!hasApiKey && (
            <p className="text-xs text-muted-foreground">
              Add your CalorieNinjas API key in Settings for food search.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
