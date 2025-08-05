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
	example: {
		image: true,
		title: true,
		body: true,
		details: true,
	},
	question: {
		image: false,
		title: true,
		body: false,
		details: false,
	},
	idea: {
		image: false,
		title: true,
		body: true,
		details: false,
	},
}