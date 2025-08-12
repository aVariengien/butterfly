import { Editor, createShapeId } from 'tldraw'
import { GeneratedCard } from '../types/session'
import { SESSION_START_TIME } from '../utils/constants'

// Types for fluid type checking
interface FluidTypeCheckingRequest {
	card: {
		w: number
		h: number
		x: number
		y: number
		title: string
		body: string
		card_type: string
		img_prompt?: string
		img_source?: string
		details?: string
		createdAt?: number
	}
	sidepanel_code: string
}

interface FluidTypeCheckingResponse {
	errors: string[]
	field_scores: Record<string, { score: number; reasoning: string }>
}

// API function to generate cards
export async function generateCard(editor: Editor, sidepanelCode: string, intention: string): Promise<GeneratedCard[] | null> {
	try {
		// Get current cards from the editor
		const shapes = editor.getCurrentPageShapes()
		const cards = shapes
			.filter(shape => shape.type === 'card')
			.map(shape => {
				const props = shape.props as any // Type assertion to access custom props
				return {
					w: props.w || 300,
					h: props.h || 300,
					x: shape.x,
					y: shape.y,
					title: props.title || '',
					body: props.body || '',
					card_type: props.card_type || '',
					img_prompt: props.img_prompt || '',
					img_source: props.img_source || '',
					details: props.details || '',
					createdAt: props.createdAt || Math.floor((Date.now() - SESSION_START_TIME) / 1000)
				}
			})

		const requestBody = { 
			cards,
			sidepanel_code: sidepanelCode,
			intention: intention
		}
		
		console.log('Sending request to backend:', requestBody)

		const response = await fetch('http://localhost:8000/generate-card', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(requestBody),
		})

		if (!response.ok) {
			const errorText = await response.text()
			console.error('Backend error:', response.status, errorText)
			throw new Error(`Failed to generate card: ${response.status} - ${errorText}`)
		}

		const generatedCards = await response.json()
		console.log('Generated cards received:', generatedCards)
		return generatedCards.map(card => ({
			...card,
			id: createShapeId(),
		}))
	} catch (error) {
		console.error('Error generating card:', error)
		return null
	}
}

// Function to create a hash of card content for change detection
function createCardHash(card: any): string {
	const content = {
		title: card.title || '',
		body: card.body || '', 
		details: card.details || '',
		card_type: card.card_type || '',
		img_prompt: card.img_prompt || '',
		img_source: card.img_source || ''
	}
	return btoa(JSON.stringify(content))
}

// API function for fluid type checking
export async function performFluidTypeChecking(
	cardProps: any,
	sidepanelCode: string
): Promise<string[] | null> {
	try {
		// Create card hash for change detection
		const currentHash = createCardHash(cardProps)
		
		// Skip if card hasn't changed since last validation
		if (cardProps.lastValidationValue === currentHash) {
			console.log('Card unchanged, skipping fluid type checking')
			return cardProps.fluidErrors || []
		}

		const card = {
			w: cardProps.w || 300,
			h: cardProps.h || 300, 
			x: cardProps.x || 0,
			y: cardProps.y || 0,
			title: cardProps.title || '',
			body: cardProps.body || '',
			card_type: cardProps.card_type || '',
			img_prompt: cardProps.img_prompt || '',
			img_source: cardProps.img_source || '',
			details: cardProps.details || '',
			createdAt: cardProps.createdAt || Math.floor((Date.now() - SESSION_START_TIME) / 1000)
		}

		const requestBody: FluidTypeCheckingRequest = {
			card,
			sidepanel_code: sidepanelCode
		}
		
		console.log('Performing fluid type checking for card:', card.card_type)

		const response = await fetch('http://localhost:8000/fluid-type-checking', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(requestBody),
		})

		if (!response.ok) {
			const errorText = await response.text()
			console.error('Fluid type checking error:', response.status, errorText)
			throw new Error(`Failed to perform fluid type checking: ${response.status} - ${errorText}`)
		}

		const result: FluidTypeCheckingResponse = await response.json()
		console.log('Fluid type checking result:', result)
		
		return result.errors || []
	} catch (error) {
		console.error('Error performing fluid type checking:', error)
		return null
	}
}

// API function to generate an image from a prompt
export async function generateImageForCard(prompt: string): Promise<string | null> {
	try {
		const response = await fetch('http://localhost:8000/generate-image', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ prompt }),
		})

		if (!response.ok) {
			console.error('Image generation error:', response.status)
			return null
		}

		const data = await response.json()
		return data.success ? data.image_url : null
	} catch (error) {
		console.error('Error generating image:', error)
		return null
	}
}