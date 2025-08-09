import { CardType } from './card-shape-types'

// Dictionary mapping card types to their border colors
export const CardTypeToColors: Record<CardType, string> = {
	example: 'blue',
	question: 'green',
	idea: 'pink'
}

// Dictionary mapping card types to which fields should be displayed
export const CardTypeToLayout: Record<CardType, {
	image: boolean
	title: boolean
	body: boolean
	details: boolean
}> = {
	Example: {
		image: true,
		title: true,
		body: true,
		details: true,
	},
	Question: {
		image: false,
		title: true,
		body: false,
		details: false,
	},
	Idea: {
		image: false,
		title: true,
		body: true,
		details: false,
	},
}