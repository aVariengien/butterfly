import { useState, useEffect, useCallback } from 'react'
import { Editor, createShapeId } from 'tldraw'
import { generateCard } from '../services/cardApiService'
import { getValidationCardsCount, getPageByName } from '../utils/shapeUtils'
import { SESSION_START_TIME, MAX_VALIDATION_CARDS, CARD_GENERATION_INTERVAL } from '../utils/constants'

export interface UseCardGenerationReturn {
	isGenerating: boolean
	triggerCardGeneration: () => Promise<void>
	getValidationCardsCount: () => number
}

export function useCardGeneration(
	editor: Editor | null, 
	sessionEnded: boolean
): UseCardGenerationReturn {
	const [isGenerating, setIsGenerating] = useState(false)

	// Function to count cards that need validation
	const getValidationCardsCountWrapper = useCallback(() => {
		if (!editor) return 0
		return getValidationCardsCount(editor)
	}, [editor])

	// Function to generate a new card
	const triggerCardGeneration = useCallback(async () => {
		if (!editor || isGenerating) return
		
		const validationCardsCount = getValidationCardsCountWrapper()
		if (validationCardsCount >= MAX_VALIDATION_CARDS) return
		
		setIsGenerating(true)
		try {
			const newCard = await generateCard(editor)
			if (newCard) {
				// Create the card shape on canvas immediately but mark it for validation
				const shapeId = createShapeId(newCard.id)
				const creationTime = Math.floor((Date.now() - SESSION_START_TIME) / 1000)
				
				// Store current page to restore later
				const currentPageId = editor.getCurrentPageId()
				
				// Find and switch to Active page
				const activePage = getPageByName(editor, 'Active')
				
				if (activePage) {
					editor.setCurrentPage(activePage.id)
					
					// Create the card on Active page
					editor.createShapes([{
						id: shapeId,
						type: 'card',
						x: newCard.x,
						y: newCard.y,
						props: {
							w: newCard.w,
							h: newCard.h,
							title: newCard.title,
							body: newCard.body,
							image: newCard.image || '',
							details: newCard.details || '',
							card_type: newCard.card_type,
							toValidate: true, // Mark card for validation
							createdAt: newCard.createdAt || creationTime,
						},
					}])
					
					// Switch back to the original page
					editor.setCurrentPage(currentPageId)
					
					console.log('Card created on Active page while viewing:', editor.getPages().find(page => page.id === currentPageId)?.name)
				}
			}
		} finally {
			setIsGenerating(false)
		}
	}, [editor, isGenerating, getValidationCardsCountWrapper])

	// Auto-generation timer
	useEffect(() => {
		if (!editor) return

		const interval = setInterval(() => {
			const validationCardsCount = getValidationCardsCountWrapper()
			if (validationCardsCount < MAX_VALIDATION_CARDS && !sessionEnded) {
				console.log("session ended", sessionEnded);
				triggerCardGeneration()
			}
		}, CARD_GENERATION_INTERVAL)

		return () => clearInterval(interval)
	}, [editor, triggerCardGeneration, getValidationCardsCountWrapper, sessionEnded])

	return {
		isGenerating,
		triggerCardGeneration,
		getValidationCardsCount: getValidationCardsCountWrapper,
	}
}