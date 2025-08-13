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
import { FrequencySlider } from './components/FrequencySlider'
import { components } from './ui-overrides'
import { useSessionManager } from './hooks/useSessionManager'
import { useCardGeneration } from './hooks/useCardGeneration'
import { usePageManager } from './hooks/usePageManager'
import { useTldrawEvents } from './hooks/useTldrawEvents'
import { useTldrawRestrictions } from './hooks/useTldrawRestrictions'
import { useCardTypesInitialization } from './hooks/useCardTypesInitialization'
import { useAutoSave } from './hooks/useAutoSave'
import { updateCardTypes } from './utils/dynamicCardConfig'
import { createShapeId } from 'tldraw'

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
	const [generationFrequency, setGenerationFrequency] = useState(30) // Default to 30 seconds
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
	const { isGenerating } = useCardGeneration(editor, sessionEnded, sidepanelCode, intention, generationFrequency)

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

	// Auto-save whiteboard state every 5 minutes when it changes
	useAutoSave(editor, intention, sessionDuration)

	const handleSidepanelCodeChange = (code: string) => {
		setSidepanelCode(code)
	}

	const downloadBoardState = () => {
		if (!editor) return
		
		// Get all shapes from current page
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
					createdAt: props.createdAt || Math.floor(Date.now() / 1000)
				}
			})

		const boardState = {
			intention,
			sessionDuration,
			timestamp: new Date().toISOString(),
			cards
		}
		
		// Create and download JSON file
		const dataStr = JSON.stringify(boardState, null, 2)
		const dataBlob = new Blob([dataStr], { type: 'application/json' })
		const url = URL.createObjectURL(dataBlob)
		const link = document.createElement('a')
		link.href = url
		link.download = `butterfly-board-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
		document.body.appendChild(link)
		link.click()
		document.body.removeChild(link)
		URL.revokeObjectURL(url)
	}

	const loadBoardState = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0]
		if (!file || !editor) return

		const reader = new FileReader()
		reader.onload = (e) => {
			try {
				const content = e.target?.result as string
				const boardState = JSON.parse(content)
				
				// Update intention if provided
				if (boardState.intention) {
					setIntention(boardState.intention)
				}

				// Create cards from the loaded data
				if (boardState.cards && Array.isArray(boardState.cards)) {
					const shapesToCreate = boardState.cards.map((card: any) => ({
						id: createShapeId(),
						type: 'card',
						x: card.x || 0,
						y: card.y || 0,
						props: {
							w: card.w || 300,
							h: card.h || 300,
							title: card.title || '',
							body: card.body || '',
							card_type: card.card_type || '',
							img_prompt: card.img_prompt || '',
							img_source: card.img_source || '',
							details: card.details || '',
							createdAt: card.createdAt || Math.floor(Date.now() / 1000),
							toValidate: false // Loaded cards don't need validation
						}
					}))

					editor.createShapes(shapesToCreate)
					console.log(`Loaded ${boardState.cards.length} cards from file`)
				}
			} catch (error) {
				console.error('Error loading board state:', error)
				alert('Error loading file. Please check the JSON format.')
			}
		}
		reader.readAsText(file)
		
		// Reset the file input
		event.target.value = ''
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
						onDownload={downloadBoardState}
						onUpload={loadBoardState}
					/>
					<div style={{ height: '100%' }}>
						<SessionProvider
							sessionEnded={sessionEnded}
							selectedCards={selectedCards}
							onCardSelect={handleCardSelect}
							sidepanelCode={sidepanelCode}
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
					
					{/* Frequency Slider */}
					<FrequencySlider 
						frequency={generationFrequency}
						onChange={setGenerationFrequency}
					/>
					
					{/* Session End Overlay */}
					{sessionEnded && (
						<SessionEndOverlay onFinishSession={handleFinishSession} />
					)}
				</div>
			)}
		</MantineProvider>
	)
}