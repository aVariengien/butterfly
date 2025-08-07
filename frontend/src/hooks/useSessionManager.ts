import { useState, useEffect, useCallback } from 'react'
import { DEFAULT_SESSION_DURATION } from '../utils/constants'

export interface UseSessionManagerReturn {
	// Landing page state
	showLandingPage: boolean
	intention: string
	setIntention: (value: string) => void
	sessionDuration: number
	setSessionDuration: (value: number) => void
	handleCollapseLanding: () => void
	
	// Session state
	sessionEnded: boolean
	sessionNumber: number
	selectedCards: Set<string>
	sessionEndTime: number | null
	timeRemaining: number | null
	
	// Session actions
	handleCardSelect: (cardId: string) => void
	setSessionEnded: (ended: boolean) => void
	setSelectedCards: (cards: Set<string>) => void
	setSessionNumber: (num: number) => void
	setSessionEndTime: (time: number | null) => void
	setTimeRemaining: (time: number | null) => void
}

export function useSessionManager(): UseSessionManagerReturn {
	// Landing page state
	const [showLandingPage, setShowLandingPage] = useState(true)
	const [intention, setIntention] = useState('')
	const [sessionDuration, setSessionDuration] = useState(DEFAULT_SESSION_DURATION)
	
	// Session timing
	const [sessionEndTime, setSessionEndTime] = useState<number | null>(null)
	const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
	
	// Session end management
	const [sessionEnded, setSessionEnded] = useState(false)
	const [sessionNumber, setSessionNumber] = useState(1)
	const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set())

	// Handle collapsing the landing page and start timer
	const handleCollapseLanding = useCallback(() => {
		const endTime = Date.now() + (sessionDuration * 60 * 1000) // Convert minutes to milliseconds
		setSessionEndTime(endTime)
		setTimeRemaining(sessionDuration * 60) // Convert to seconds
		setShowLandingPage(false)
		setSessionEnded(false) // Reset session ended state for new session
		setSelectedCards(new Set()) // Clear selected cards
	}, [sessionDuration])

	// Handle card selection during session end
	const handleCardSelect = useCallback((cardId: string) => {
		if (!sessionEnded) return
		
		setSelectedCards(prev => {
			const newSet = new Set(prev)
			if (newSet.has(cardId)) {
				newSet.delete(cardId)
			} else {
				newSet.add(cardId)
			}
			console.log(newSet)
			return newSet
		})
	}, [sessionEnded])

	// Session timer
	useEffect(() => {
		if (!sessionEndTime) return

		const interval = setInterval(() => {
			const now = Date.now()
			const remaining = Math.max(0, Math.ceil((sessionEndTime - now) / 1000))
			setTimeRemaining(remaining)

			if (remaining === 0) {
				clearInterval(interval)
				setSessionEnded(true)
			}
		}, 1000)

		return () => clearInterval(interval)
	}, [sessionEndTime])

	return {
		// Landing page
		showLandingPage,
		intention,
		setIntention,
		sessionDuration,
		setSessionDuration,
		handleCollapseLanding,
		
		// Session state
		sessionEnded,
		sessionNumber,
		selectedCards,
		sessionEndTime,
		timeRemaining,
		
		// Session actions
		handleCardSelect,
		setSessionEnded,
		setSelectedCards,
		setSessionNumber,
		setSessionEndTime,
		setTimeRemaining,
	}
}