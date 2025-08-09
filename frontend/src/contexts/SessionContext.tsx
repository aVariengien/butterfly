import React, { createContext, useContext } from 'react'

interface SessionContextType {
	sessionEnded: boolean
	selectedCards: Set<string>
	onCardSelect: (cardId: string) => void
	sidepanelCode?: string
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
	onCardSelect,
	sidepanelCode
}: { 
	children: React.ReactNode
	sessionEnded: boolean
	selectedCards: Set<string>
	onCardSelect: (cardId: string) => void
	sidepanelCode?: string
}) {
	return (
		<SessionContext.Provider value={{ sessionEnded, selectedCards, onCardSelect, sidepanelCode }}>
			{children}
		</SessionContext.Provider>
	)
}