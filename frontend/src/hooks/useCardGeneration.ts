import { useState, useEffect, useCallback } from 'react'
import { Editor, createShapeId } from 'tldraw'
import { generateCard } from '../services/cardApiService'
import { getPageByName } from '../utils/shapeUtils'
import { SESSION_START_TIME, CARD_POSITION_MARGIN } from '../utils/constants'
import { GeneratedCard } from '../types/session'

export interface UseCardGenerationReturn {
	isGenerating: boolean
	bufferedCards: GeneratedCard[]
	triggerCardGeneration: () => Promise<void>
	createBufferedCards: () => Promise<void>
}

export function useCardGeneration(
	editor: Editor | null, 
	sessionEnded: boolean,
	sidepanelCode: string,
	intention: string,
	timeRemaining: number | null,
	sessionDuration: number
): UseCardGenerationReturn {
	const [isGenerating, setIsGenerating] = useState(false)
	const [bufferedCards, setBufferedCards] = useState<GeneratedCard[]>([])
	const [generationTriggered, setGenerationTriggered] = useState({ at30: false, at50: false, at70: false })

	// Reset generation flags when a new session starts
	useEffect(() => {
		if (timeRemaining === sessionDuration * 60) {
			// This indicates a fresh session start
			setGenerationTriggered({ at30: false, at50: false, at70: false })
			setBufferedCards([]) // Also clear any leftover buffered cards
		}
	}, [timeRemaining, sessionDuration])

	// Check if two rectangles overlap (with margin)
	const doRectsOverlap = useCallback((rect1: { x: number, y: number, w: number, h: number }, rect2: { x: number, y: number, w: number, h: number }) => {
		// Check if rectangles are separated by at least the margin distance
		return !(
			rect1.x + rect1.w + CARD_POSITION_MARGIN <= rect2.x ||  // rect1 is completely to the left
			rect2.x + rect2.w + CARD_POSITION_MARGIN <= rect1.x ||  // rect2 is completely to the left  
			rect1.y + rect1.h + CARD_POSITION_MARGIN <= rect2.y ||  // rect1 is completely above
			rect2.y + rect2.h + CARD_POSITION_MARGIN <= rect1.y     // rect2 is completely above
		)
	}, [])

	// Calculate distance between two card centers
	const getDistanceBetweenCenters = useCallback((card1: { x: number, y: number, w: number, h: number }, card2: { x: number, y: number, w: number, h: number }) => {
		const center1 = { x: card1.x + card1.w / 2, y: card1.y + card1.h / 2 }
		const center2 = { x: card2.x + card2.w / 2, y: card2.y + card2.h / 2 }
		return Math.sqrt(Math.pow(center1.x - center2.x, 2) + Math.pow(center1.y - center2.y, 2))
	}, [])

	// Find a valid position for a new card
	const findValidPosition = useCallback((newCard: GeneratedCard, existingCards: Array<{ x: number, y: number, w: number, h: number }>) => {
		// If no existing cards, use the card's original position
		if (existingCards.length === 0) {
			return { x: newCard.x, y: newCard.y }
		}

		// Sort existing cards by distance from the new card's original position
		const sortedCards = [...existingCards].sort((a, b) => 
			getDistanceBetweenCenters(newCard, a) - getDistanceBetweenCenters(newCard, b)
		)

		for (const targetCard of sortedCards) {
			// Try positions: above, left, right, below
			const positions = [
				{ x: targetCard.x, y: targetCard.y - newCard.h - CARD_POSITION_MARGIN }, // above
				{ x: targetCard.x - newCard.w - CARD_POSITION_MARGIN, y: targetCard.y }, // left
				{ x: targetCard.x + targetCard.w + CARD_POSITION_MARGIN, y: targetCard.y }, // right
				{ x: targetCard.x, y: targetCard.y + targetCard.h + CARD_POSITION_MARGIN } // below
			]

			for (const pos of positions) {
				const testCard = { ...newCard, x: pos.x, y: pos.y }
				let hasOverlap = false

				for (const existingCard of existingCards) {
					if (doRectsOverlap(testCard, existingCard)) {
						hasOverlap = true
						break
					}
				}

				if (!hasOverlap) {
					return pos
				}
			}
		}

		// If we can't find a position around existing cards, try some fallback positions
		const fallbackPositions = [
			{ x: 50, y: 50 },
			{ x: 500, y: 100 },
			{ x: 100, y: 500 },
			{ x: 800, y: 200 },
			{ x: 200, y: 800 }
		]
		
		for (const pos of fallbackPositions) {
			const testCard = { ...newCard, x: pos.x, y: pos.y }
			let hasOverlap = false

			for (const existingCard of existingCards) {
				if (doRectsOverlap(testCard, existingCard)) {
					hasOverlap = true
					break
				}
			}

			if (!hasOverlap) {
				return pos
			}
		}

		// Emergency fallback - place far away
		return { x: 1000, y: 1000 }
	}, [doRectsOverlap, getDistanceBetweenCenters])

	// Function to generate cards and add to buffer
	const triggerCardGeneration = useCallback(async () => {
		if (!editor || isGenerating) return
		
		setIsGenerating(true)
		try {
			const newCards = await generateCard(editor, sidepanelCode, intention)
			if (newCards && newCards.length > 0) {
				setBufferedCards(prev => [...prev, ...newCards])
				console.log(`${newCards.length} card(s) added to buffer`)
			}
		} catch (error) {
			console.error('Error generating cards:', error)
		} finally {
			setIsGenerating(false)
		}
	}, [editor, isGenerating, sidepanelCode, intention])

	// Create buffered cards at session end
	const createBufferedCards = useCallback(async () => {
		if (!editor || bufferedCards.length === 0) return

		// Store current page to restore later
		const currentPageId = editor.getCurrentPageId()
		
		// Find and switch to Active page
		const activePage = getPageByName(editor, 'Active')
		
		if (activePage) {
			editor.setCurrentPage(activePage.id)
			
			// Get existing cards for positioning
			const shapes = editor.getCurrentPageShapes()
			const existingCards = shapes
				.filter(shape => shape.type === 'card')
				.map(shape => ({
					x: shape.x,
					y: shape.y,
					w: (shape.props as any).w || 300,
					h: (shape.props as any).h || 300
				}))
			
			// Position and create cards one by one
			const shapesToCreate = []
			const placedCards = [...existingCards]
			
			for (const bufferedCard of bufferedCards) {
				try {
					const position = findValidPosition(bufferedCard, placedCards)
					const shapeId = createShapeId(bufferedCard.id)
					const creationTime = Math.floor((Date.now() - SESSION_START_TIME) / 1000)
					
					const newShape = {
						id: shapeId,
						type: 'card',
						x: position.x,
						y: position.y,
						props: {
							w: bufferedCard.w,
							h: bufferedCard.h,
							title: bufferedCard.title,
							body: bufferedCard.body,
							img_prompt: bufferedCard.img_prompt || '',
							img_source: bufferedCard.img_source || '',
							extra_fields: bufferedCard.extra_fields || {},
							card_type: bufferedCard.card_type,
							toValidate: true,
							createdAt: bufferedCard.createdAt || creationTime,
						},
					}
					
					shapesToCreate.push(newShape)
					placedCards.push({
						x: position.x,
						y: position.y,
						w: bufferedCard.w,
						h: bufferedCard.h
					})
				} catch (error) {
					console.error('Error positioning card:', error)
				}
			}
			
			// Create all positioned cards at once
			if (shapesToCreate.length > 0) {
				editor.createShapes(shapesToCreate)
				console.log(`${shapesToCreate.length} buffered card(s) created on Active page`)
			}
			
			// Switch back to the original page
			editor.setCurrentPage(currentPageId)
			
			// Clear buffer
			setBufferedCards([])
		}
	}, [editor, bufferedCards, findValidPosition])

	// Timer-based card generation (30%, 50%, 70%)
	useEffect(() => {
		if (!timeRemaining || sessionEnded || !sessionDuration) return

		const sessionDurationSeconds = sessionDuration * 60 // Convert to seconds
		const elapsedTime = sessionDurationSeconds - timeRemaining
		const progressPercent = (elapsedTime / sessionDurationSeconds) * 100

		// Trigger generation at specific percentages
		if (progressPercent >= 30 && !generationTriggered.at30) {
			setGenerationTriggered(prev => ({ ...prev, at30: true }))
			triggerCardGeneration()
		} else if (progressPercent >= 50 && !generationTriggered.at50) {
			setGenerationTriggered(prev => ({ ...prev, at50: true }))
			triggerCardGeneration()
		} else if (progressPercent >= 70 && !generationTriggered.at70) {
			setGenerationTriggered(prev => ({ ...prev, at70: true }))
			triggerCardGeneration()
		}
	}, [timeRemaining, sessionEnded, sessionDuration, generationTriggered, triggerCardGeneration])

	return {
		isGenerating,
		bufferedCards,
		triggerCardGeneration,
		createBufferedCards,
	}
}