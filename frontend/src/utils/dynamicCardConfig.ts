// Dynamic card configuration management
import { CardTypeToColors as DefaultColors, CardTypeToLayout as DefaultLayouts } from '../card/card-config'

// Store for dynamic card types
let dynamicCardTypes: {
  colors: Record<string, string>
  layouts: Record<string, Record<string, boolean>>
} | null = null

// Get current card types (dynamic if available, otherwise default)
export function getCurrentCardTypes() {
  if (dynamicCardTypes) {
    return dynamicCardTypes
  }
  return {
    colors: DefaultColors,
    layouts: DefaultLayouts
  }
}

// Update card types dynamically
export function updateCardTypes(newTypes: { colors: Record<string, string>, layouts: Record<string, Record<string, boolean>> }) {
  dynamicCardTypes = newTypes
  console.log("new typess", newTypes)
  
  // Trigger a custom event to notify components of the update
  const event = new CustomEvent('cardTypesUpdated', { 
    detail: newTypes 
  })
  window.dispatchEvent(event)
}

// Get available card type names
export function getCardTypeNames(): string[] {
  const current = getCurrentCardTypes()
  return Object.keys(current.colors)
}

// Get color for a card type
export function getCardTypeColor(cardType: string): string {
  const current = getCurrentCardTypes()
  return current.colors[cardType] || 'gray'
}

// Get layout for a card type
export function getCardTypeLayout(cardType: string): Record<string, boolean> {
  const current = getCurrentCardTypes()
  return current.layouts[cardType] || {
    image: true,
    title: true,
    body: true,
    details: true
  }
}