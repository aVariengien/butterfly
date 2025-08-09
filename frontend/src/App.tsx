import React, { useState } from 'react'
import { MantineProvider, TextInput, createTheme } from '@mantine/core'
import '@mantine/core/styles.css'
import inputVariantsClasses from './styles/InputVariants.module.css'
import { Tldraw, Editor } from 'tldraw'
import { useSyncDemo } from '@tldraw/sync'
import 'tldraw/tldraw.css'
import { CardShapeUtil } from './card/CardShapeUtil'
import { SessionEndOverlay } from './components/SessionEndOverlay'
import { SidePanel } from './components/SidePanel'
import { SessionProvider } from './contexts/SessionContext'
import { Header } from './components/layout/Header'
import { LandingPage } from './components/layout/LandingPage'
import { components } from './ui-overrides'
import { useSessionManager } from './hooks/useSessionManager'
import { useCardGeneration } from './hooks/useCardGeneration'
import { usePageManager } from './hooks/usePageManager'
import { useTldrawEvents } from './hooks/useTldrawEvents'
import { useTldrawRestrictions } from './hooks/useTldrawRestrictions'
import { useCardTypesInitialization } from './hooks/useCardTypesInitialization'
import { updateCardTypes } from './utils/dynamicCardConfig'

// Custom shape utils array
const customShapeUtils = [CardShapeUtil]

// Create custom theme with TextInput variants
const theme = createTheme({
	components: {
		TextInput: TextInput.extend({
			classNames: inputVariantsClasses,
		}),
	},
})

export default function App() {
	const [editor, setEditor] = useState<Editor | null>(null)
	const [sidepanelCode, setSidepanelCode] = useState('')

	// Session management
	const {
		showLandingPage,
		intention,
		setIntention,
		sessionDuration,
		setSessionDuration,
		handleCollapseLanding,
		sessionEnded,
		sessionNumber,
		selectedCards,
		sessionEndTime,
		timeRemaining,
		handleCardSelect,
		setSessionEnded,
		setSelectedCards,
		setSessionNumber,
		setSessionEndTime,
		setTimeRemaining,
	} = useSessionManager()

	// Page management
	const {
		currentPage,
		initializePages,
		switchToPage,
		handleEndSession,
		handleFinishSession,
	} = usePageManager(
		editor,
		selectedCards,
		sessionDuration,
		sessionNumber,
		setSessionEnded,
		setSelectedCards,
		setSessionNumber,
		{
			setSessionEndTime,
			setTimeRemaining,
		}
	)

	// Card generation
	const { isGenerating } = useCardGeneration(editor, sessionEnded, sidepanelCode, intention)

	// TLDraw event handling
	useTldrawEvents(editor, sessionEnded, handleCardSelect)

	// TLDraw restrictions for History view
	useTldrawRestrictions(editor)

	const handleUpdateTypes = (cardTypes: { colors: Record<string, string>, layouts: Record<string, Record<string, boolean>> }) => {
		console.log('Updating card types:', cardTypes)
		updateCardTypes(cardTypes)
	}

	// Auto-initialize card types on app load
	useCardTypesInitialization(sidepanelCode, handleUpdateTypes)

	const handleSidepanelCodeChange = (code: string) => {
		setSidepanelCode(code)
	}

	return (
		<MantineProvider theme={theme}>
			{showLandingPage ? (
				<LandingPage
					intention={intention}
					setIntention={setIntention}
					sessionDuration={sessionDuration}
					setSessionDuration={setSessionDuration}
					onEnter={handleCollapseLanding}
				/>
			) : (
				<div style={{ position: 'fixed', inset: 0 }}>
					{/* Side Panel */}
					<SidePanel 
						onUpdateTypes={handleUpdateTypes}
						onCodeChange={handleSidepanelCodeChange}
					/>
					
					<Header
						intention={intention}
						setIntention={setIntention}
						timeRemaining={timeRemaining}
						currentPage={currentPage}
						onPageSwitch={switchToPage}
						onEndSession={handleEndSession}
					/>
					<div style={{ height: '100%' }}>
						<SessionProvider
							sessionEnded={sessionEnded}
							selectedCards={selectedCards}
							onCardSelect={handleCardSelect}
						>
							<Tldraw
								shapeUtils={customShapeUtils}
								components={components}
								onMount={(editorInstance: Editor) => {
									setEditor(editorInstance)
									initializePages(editorInstance)
								}}
							/>
						</SessionProvider>
					</div>
					
					{/* Session End Overlay */}
					{sessionEnded && (
						<SessionEndOverlay onFinishSession={handleFinishSession} />
					)}
				</div>
			)}
		</MantineProvider>
	)
}