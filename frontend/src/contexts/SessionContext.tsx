import React, { createContext, useContext } from 'react'

interface SessionContextType {
	sessionEnded: boolean
	selectedCards: Set<string>
	onCardSelect: (cardId: string) => void
}

const SessionContext = createContext<SessionContextType | null>(null)

export function useSessionContext() {
	const context = useContext(SessionContext)
	if (!context) {
		throw new Error('useSessionContext must be used within a SessionProvider')
	}
	return context
}

export function SessionProvider({ 
	children, 
	sessionEnded, 
	selectedCards, 
	onCardSelect 
}: { 
	children: React.ReactNode
	sessionEnded: boolean
	selectedCards: Set<string>
	onCardSelect: (cardId: string) => void
}) {
	return (
		<SessionContext.Provider value={{ sessionEnded, selectedCards, onCardSelect }}>
			{children}
		</SessionContext.Provider>
	)
}