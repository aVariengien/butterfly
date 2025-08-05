import { CardType } from './card-shape-types'

// Global state for the currently selected card type
let currentSelectedCardType: CardType = 'example'

// Getter function
export function getSelectedCardType(): CardType {
	return currentSelectedCardType
}

// Setter function
export function setSelectedCardType(cardType: CardType): void {
	currentSelectedCardType = cardType
}