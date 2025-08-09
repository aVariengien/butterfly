import { Editor, createShapeId } from 'tldraw'
import { GeneratedCard } from '../types/session'
import { SESSION_START_TIME } from '../utils/constants'

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
					image: props.image || '',
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