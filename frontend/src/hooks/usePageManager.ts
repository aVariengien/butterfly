import { useState, useCallback } from 'react'
import { Editor } from 'tldraw'
import { initializePages, switchToPage, archiveCurrentSession } from '../services/editorService'

export interface UsePageManagerReturn {
	currentPage: 'active' | 'history'
	initializePages: (editorInstance: Editor) => void
	switchToPage: (pageName: 'active' | 'history') => void
	archiveCurrentSession: () => void
	handleEndSession: () => void
	handleFinishSession: () => void
}

export function usePageManager(
	editor: Editor | null,
	selectedCards: Set<string>,
	sessionDuration: number,
	sessionNumber: number,
	setSessionEnded: (ended: boolean) => void,
	setSelectedCards: (cards: Set<string>) => void,
	setSessionNumber: (num: number) => void,
	sessionManagerActions?: {
		setSessionEndTime: (time: number | null) => void,
		setTimeRemaining: (time: number | null) => void
	}
): UsePageManagerReturn {
	const [currentPage, setCurrentPage] = useState<'active' | 'history'>('active')

	// Initialize pages when editor is ready
	const initializePagesWrapper = useCallback((editorInstance: Editor) => {
		initializePages(editorInstance)
	}, [])

	// Switch between Active and History pages
	const switchToPageWrapper = useCallback((pageName: 'active' | 'history') => {
		if (!editor) return
		
		const success = switchToPage(editor, pageName)
		if (success) {
			setCurrentPage(pageName)
		}
	}, [editor])

	// Archive current session to history page
	const archiveCurrentSessionWrapper = useCallback(() => {
		if (!editor) return
		archiveCurrentSession(editor, sessionNumber)
	}, [editor, sessionNumber])

	// Handle ending a session early (show overlay)
	const handleEndSession = useCallback(() => {
		if (!editor) return
		switchToPageWrapper('active')
		setSessionEnded(true)
	}, [editor, switchToPageWrapper, setSessionEnded])

	// Handle finishing a session (archive and start new) - called from overlay
	const handleFinishSession = useCallback(() => {
		if (!editor) return
		switchToPageWrapper('active')
		// Archive current session to history
		archiveCurrentSessionWrapper()
		
		// Remove non-selected cards from active page
		const currentShapes = editor.getCurrentPageShapes()
		const cardShapes = currentShapes.filter(shape => shape.type === 'card')
		const cardsToDelete = cardShapes.filter(shape => !selectedCards.has(shape.id))
		
		if (cardsToDelete.length > 0) {
			editor.deleteShapes(cardsToDelete.map(shape => shape.id))
		}
		
		console.log('Selected cards for next session:', Array.from(selectedCards))
		
		// Reset session state
		setSessionEnded(false)
		setSelectedCards(new Set())
		setSessionNumber(sessionNumber + 1)
		
		// Reset timer for new session
		if (sessionManagerActions) {
			const endTime = Date.now() + (sessionDuration * 60 * 1000)
			sessionManagerActions.setSessionEndTime(endTime)
			sessionManagerActions.setTimeRemaining(sessionDuration * 60)
		}
	}, [
		editor, 
		selectedCards, 
		sessionDuration, 
		sessionNumber,
		switchToPageWrapper,
		archiveCurrentSessionWrapper,
		setSessionEnded,
		setSelectedCards,
		setSessionNumber,
		sessionManagerActions
	])

	return {
		currentPage,
		initializePages: initializePagesWrapper,
		switchToPage: switchToPageWrapper,
		archiveCurrentSession: archiveCurrentSessionWrapper,
		handleEndSession,
		handleFinishSession,
	}
}