import React, { useState, useEffect, useCallback } from 'react'
import { MantineProvider, SegmentedControl, TextInput, createTheme, Slider, Text, Group, Button } from '@mantine/core'
import '@mantine/core/styles.css'
import inputVariantsClasses from './InputVariants.module.css'
import { Tldraw, createShapeId, Editor } from 'tldraw'
import 'tldraw/tldraw.css'
import { CardShapeUtil } from './CardShapeUtil'
import { getSelectedCardType, setSelectedCardType } from './card-state'
import { CardType } from './card-shape-types'
import { CardTypeToLayout } from './card-config'
import { SessionEndOverlay } from './components/SessionEndOverlay'
import { SessionProvider } from './contexts/SessionContext'
import { components } from './ui-overrides'

// There's a guide at the bottom of this file!

// Session start time for calculating relative timestamps
const SESSION_START_TIME = Date.now()

// Types for generated cards
interface GeneratedCard {
	id: string
	w: number
	h: number
	x: number
	y: number
	title: string
	body: string
	image?: string
	details?: string
	card_type: string
	createdAt?: number
}

// [1]
const customShapeUtils = [CardShapeUtil]
// No custom tools - use default tldraw tools

// Helper function to format time
const formatTime = (seconds: number): string => {
	const minutes = Math.floor(seconds / 60)
	const remainingSeconds = seconds % 60
	return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

// Create custom theme with TextInput variants
const theme = createTheme({
	components: {
		TextInput: TextInput.extend({
			classNames: inputVariantsClasses,
		}),
	},
})

// Landing Page Component
function LandingPage({ 
	intention, 
	setIntention,
	sessionDuration,
	setSessionDuration,
	onEnter 
}: { 
	intention: string
	setIntention: (value: string) => void
	sessionDuration: number
	setSessionDuration: (value: number) => void
	onEnter: () => void 
}) {
	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter') {
			onEnter()
		}
	}

	return (
		<div
			style={{
				position: 'fixed',
				inset: 0,
				backgroundSize: 'cover',
				backgroundPosition: 'center',
				backgroundRepeat: 'no-repeat',
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				zIndex: 9999,
			}}
		>
			<div style={{ textAlign: 'center', maxWidth: '1000px', width: '100%', padding: '20px'}}>
				<h1
					style={{
						fontFamily: '"Montserrat", serif',
						fontSize: '2.5rem',
						fontWeight: 400,
						color: 'black',
						marginBottom: '0rem',
						lineHeight: 1.2,
					}}
				>
					There is something about
				</h1>
				<TextInput
					variant="landing"
					placeholder=""
					value={intention}
					onChange={(e) => setIntention(e.target.value)}
					onKeyDown={handleKeyPress}
					autoFocus
				/>
			</div>
			<div>
				{/* Session Duration Picker */}
				<div style={{ marginTop: '3rem', width: '100%', maxWidth: '500px' }}>
					<Text 
						size="lg" 
						style={{ 
							fontFamily: '"Montserrat", serif',
							color: 'black',
							textAlign: 'center',
							marginBottom: '1rem',
							fontWeight: 500
						}}
					>
						Session Duration:
					</Text>
					<Slider
						value={sessionDuration}
						onChange={setSessionDuration}
						min={0.1}
						max={20}
						step={1}
						marks={[
							{ value: 0.1, label: '0.1min' },
							{ value: 10, label: '10min' },
							{ value: 15, label: '15min' },
							{ value: 20, label: '20min' },
						]}
						color="dark"
						size="lg"
						styles={{
							track: {
								backgroundColor: 'rgba(0, 0, 0, 0.2)',
							},
							bar: {
								backgroundColor: 'rgba(0, 0, 0, 0.8)',
							},
							thumb: {
								backgroundColor: 'black',
								border: '2px solid white',
							},
							markLabel: {
								color: 'rgba(0, 0, 0, 0.7)',
								fontFamily: '"Montserrat", serif',
								fontSize: '0.8rem',
							},
						}}
					/>
					<Text 
						size="sm" 
						style={{ 
							fontFamily: '"Montserrat", serif',
							color: 'rgba(0, 0, 0, 0.3)',
							textAlign: 'center',
							marginTop: '1.5rem',
							fontStyle: 'italic'
						}}
					>
						Press Enter to start your session
					</Text>
				</div>
			</div>
		</div>
	)
}

// Header Component (appears after landing page collapse)
function Header({ 
	intention, 
	setIntention,
	timeRemaining,
	currentPage,
	onPageSwitch
}: { 
	intention: string
	setIntention: (value: string) => void
	timeRemaining: number | null
	currentPage: 'active' | 'history'
	onPageSwitch: (page: 'active' | 'history') => void
}) {
	return (
		<div
			style={{
				position: 'fixed',
				top: 0,
				left: 0,
				right: 0,
				height: '60px',
				background: 'linear-gradient(90deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.6) 100%)',
				backdropFilter: 'blur(10px)',
				zIndex: 1000,
				display: 'flex',
				alignItems: 'center',
				padding: '0 20px',
			}}
		>
			<span
				style={{
					fontFamily: '"Montserrat", serif',
					fontSize: '1.2rem',
					color: 'white',
				}}
			>
				There is something about
			</span>
			<TextInput
				variant="header"
				placeholder="..."
				value={intention}
				onChange={(e) => setIntention(e.target.value)}
			/>
			
			{/* Page Navigation */}
			<div style={{ marginLeft: 'auto', marginRight: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
				<Button
					variant={currentPage === 'active' ? 'filled' : 'outline'}
					size="sm"
					onClick={() => onPageSwitch('active')}
					style={{
						backgroundColor: currentPage === 'active' ? 'white' : 'transparent',
						color: currentPage === 'active' ? 'black' : 'white',
						borderColor: 'white',
					}}
				>
					Active Page
				</Button>
				<Button
					variant={currentPage === 'history' ? 'filled' : 'outline'}
					size="sm"
					onClick={() => onPageSwitch('history')}
					style={{
						backgroundColor: currentPage === 'history' ? 'white' : 'transparent',
						color: currentPage === 'history' ? 'black' : 'white',
						borderColor: 'white',
					}}
				>
					History Page
				</Button>
			</div>
			
			{/* Session Timer */}
			{timeRemaining !== null && (
				<div style={{ display: 'flex', alignItems: 'center' }}>
					<Text 
						style={{
							fontFamily: '"Montserrat", serif',
							fontSize: '1.2rem',
							color: timeRemaining <= 60 ? '#ff6b6b' : 'white', // Red when less than 1 minute
							fontWeight: 600,
							textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
						}}
					>
						{formatTime(timeRemaining)}
					</Text>
				</div>
			)}
		</div>
	)
}

// API function to generate cards
async function generateCard(editor: Editor): Promise<GeneratedCard | null> {
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
					card_type: props.card_type || 'example', // Default to 'example' instead of empty
					image: props.image || '',
					details: props.details || '',
					createdAt: props.createdAt || Math.floor((Date.now() - SESSION_START_TIME) / 1000)
				}
			})

		// Get all available card types from CardTypeToLayout
		const allowedCardTypes = Object.keys(CardTypeToLayout)

		const requestBody = { 
			cards,
			allowed_card_types: allowedCardTypes
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

		const generatedCard = await response.json()
		console.log('Generated card received:', generatedCard)
		return {
			...generatedCard,
			id: createShapeId(),
		}
	} catch (error) {
		console.error('Error generating card:', error)
		return null
	}
}

// [2]
export default function CustomConfigExample() {
	const [editor, setEditor] = useState<Editor | null>(null)
	const [isGenerating, setIsGenerating] = useState(false)
	const [showLandingPage, setShowLandingPage] = useState(true)
	const [intention, setIntention] = useState('')
	const [sessionDuration, setSessionDuration] = useState(10) // in minutes
	const [sessionEndTime, setSessionEndTime] = useState<number | null>(null)
	const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
	
	// Session end management
	const [sessionEnded, setSessionEnded] = useState(false)
	const [sessionNumber, setSessionNumber] = useState(1)
	const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set())
	const [currentPage, setCurrentPage] = useState<'active' | 'history'>('active')

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

	// Initialize pages when editor is ready
	const initializePages = useCallback((editorInstance: Editor) => {
		const pages = editorInstance.getPages()
		const currentPageId = editorInstance.getCurrentPageId()
		
		// Check if history page already exists
		const historyPage = pages.find(page => page.name === 'History')
		if (!historyPage) {
			// Create history page
			editorInstance.createPage({ name: 'History' })
		}
		
		// Ensure current page is named 'Active'
		const currentPage = pages.find(page => page.id === currentPageId)
		if (currentPage && currentPage.name !== 'Active') {
			editorInstance.updatePage({ id: currentPageId, name: 'Active' })
		}
	}, [])

	// Switch between Active and History pages
	const switchToPage = useCallback((pageName: 'active' | 'history') => {
		if (!editor) return
		
		const pages = editor.getPages()
		const targetPageName = pageName === 'active' ? 'Active' : 'History'
		const targetPage = pages.find(page => page.name === targetPageName)
		
		if (targetPage) {
			editor.setCurrentPage(targetPage.id)
			setCurrentPage(pageName)
		}
	}, [editor])

	// Archive current session to history page
	const archiveCurrentSession = useCallback(() => {
		if (!editor) return

		const currentShapes = editor.getCurrentPageShapes()
		const cardShapes = currentShapes.filter(shape => shape.type === 'card')
		let bounds = {
			minX: 0,
			minY: 0,
			maxX: 0,
			maxY: 0,
		}
		if (cardShapes.length > 0) {
			bounds = {
				minX: Math.min(...cardShapes.map(shape => shape.x)),
				minY: Math.min(...cardShapes.map(shape => shape.y)),
				maxX: Math.max(...cardShapes.map(shape => shape.x + (shape.props as any).w)),
				maxY: Math.max(...cardShapes.map(shape => shape.y + (shape.props as any).h)),
			}
		}

		const sessionWidth = bounds.maxX - bounds.minX + 100 // Add padding
		const sessionHeight = bounds.maxY - bounds.minY + 100 // Add padding
		
		// Switch to history page
		const pages = editor.getPages()
		const historyPage = pages.find(page => page.name === 'History')
		if (!historyPage) {
			throw new Error("History page not found.")
		}
		
		const currentPageId = editor.getCurrentPageId()
		editor.setCurrentPage(historyPage.id)
		
		// Calculate position for new session on history page (single line layout)
		const historyShapes = editor.getCurrentPageShapes()
		const existingSessions = historyShapes.filter(shape => shape.type === 'geo' && (shape.props as any).geo === 'rectangle')
		// Find the element of existingSessions with the max X
		let lastXValue = 0;
		let lastWidth = 0;
		for (const session of existingSessions) {
			if (session.x > lastXValue) {
				lastXValue = session.x;
				lastWidth = (session.props as any).w;
			}
		}

		const nextX = lastXValue + lastWidth + 200 // Space between sessions
		const baseY = 50 // Fixed Y position for all sessions
		
		// Create session rectangle and label
		const sessionRectId = createShapeId()
		const sessionLabelId = createShapeId()
		
		editor.createShapes([
			// Session rectangle
			{
				id: sessionRectId,
				type: 'geo',
				x: nextX,
				y: baseY,
				props: {
					w: sessionWidth,
					h: sessionHeight,
					geo: 'rectangle',
					color: 'grey',
					fill: 'none',
					dash: 'solid',
				},
			},
			// Session label using note shape
			{
				id: sessionLabelId,
				type: 'text',
				x: nextX,
				y: baseY-30,
				props: {
					color: 'black',
				richText: {
					type: "doc",
					content: [
						{
							type: "paragraph",
							attrs: { dir: "auto" },
							content: [
								{
									type: "text",
									text: `Session ${sessionNumber}`
								}
							]
						}
					]
				},
				},
			},
		])
		

		if (cardShapes.length > 0) {
			// Copy all cards to history page with relative positions


			for (const shape of cardShapes) {
				editor.createShapes([{
					id: createShapeId(),
					type: 'card',
					x: nextX + (shape.x - bounds.minX) + 50, // Offset within session rectangle
					y: baseY + (shape.y - bounds.minY) + 50,
					props: {
						...shape.props as any,
						toValidate: false,
					},
				}])
			}

			/*const copiedCards = cardShapes.map(shape => ({
				...shape,
				id: createShapeId(),
				x: nextX + (shape.x - bounds.minX) + 50, // Offset within session rectangle
				y: baseY + (shape.y - bounds.minY) + 50,
			}))
			console.log("copied cards", copiedCards);
			editor.createShapes(copiedCards) */
		}
		
		// Switch back to active page
		editor.setCurrentPage(currentPageId)
		
		console.log(`Archived session ${sessionNumber} with ${cardShapes.length} cards`)
	}, [editor, sessionNumber])

	// Handle finishing a session (archive and start new)
	const handleFinishSession = useCallback(() => {
		if (!editor) return
		switchToPage('active')
		// Archive current session to history
		archiveCurrentSession()
		
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
		setSessionNumber(prev => prev + 1)
		
		// Reset timer for new session
		const endTime = Date.now() + (sessionDuration * 60 * 1000)
		setSessionEndTime(endTime)
		setTimeRemaining(sessionDuration * 60)
	}, [editor, selectedCards, sessionDuration, archiveCurrentSession, sessionNumber])

	// Function to count cards that need validation
	const getValidationCardsCount = useCallback(() => {
		if (!editor) return 0
		const shapes = editor.getCurrentPageShapes()
		return shapes.filter(shape => 
			shape.type === 'card' && 
			(shape.props as any).toValidate === true
		).length
	}, [editor])

	// Function to generate a new card
	const triggerCardGeneration = useCallback(async () => {
		if (!editor || isGenerating) return
		
		const validationCardsCount = getValidationCardsCount()
		if (validationCardsCount >= 3) return
		
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
				const pages = editor.getPages()
				const activePage = pages.find(page => page.name === 'Active')
				
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
	}, [editor, isGenerating, getValidationCardsCount])

	// Auto-generation timer
	useEffect(() => {
		if (!editor) return

		const interval = setInterval(() => {
			const validationCardsCount = getValidationCardsCount()
			if (validationCardsCount < 3 && (!sessionEnded)) {
				console.log("session ended", sessionEnded);
				triggerCardGeneration()
			}
		}, 10000) // long timer to deactivate for now

		return () => clearInterval(interval)
	}, [editor, triggerCardGeneration, getValidationCardsCount])

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

	// Handle double-click for card creation (separate from session end logic)
	useEffect(() => {
		if (!editor) return

		const handleDoubleClick = (e: MouseEvent) => {
			// Get current page to check if we're in History view
			const currentPageId = editor.getCurrentPageId()
			const currentPage = editor.getPages().find(page => page.id === currentPageId)
			const isHistoryView = currentPage && currentPage.name === "History"
		
			// Prevent all double-click behavior in History view or during session end
			if (isHistoryView || sessionEnded) {
				e.stopPropagation()
				e.preventDefault()
				e.stopImmediatePropagation()
				editor.setCurrentTool("hand");
				editor.setCurrentTool("select");
				return
			}
			
			// Prevent default tldraw behavior only when creating cards
			e.stopPropagation()
			e.preventDefault()
			e.stopImmediatePropagation()


			// Scan and delete all text shapes on Active page
			const shapes = editor.getCurrentPageShapes()
			const textShapes = shapes.filter(shape => shape.type === 'text')
			if (textShapes.length > 0) {
				editor.deleteShapes(textShapes.map(shape => shape.id))
				console.log(`Deleted ${textShapes.length} text shapes from Active page`)
			}


			// Convert screen coordinates to world coordinates
			const pagePoint = editor.screenToPage({ x: e.clientX, y: e.clientY })
			
			// Check if we clicked on a shape
			const hitShape = editor.getShapeAtPoint(pagePoint)
			if (!hitShape) {
				const selectedCardType = getSelectedCardType()
				console.log('Creating card at:', pagePoint, 'type:', selectedCardType)
				
				const creationTime = Math.floor((Date.now() - SESSION_START_TIME) / 1000)
				
				editor.createShapes([
					{
						id: createShapeId(),
						type: 'card',
						x: pagePoint.x - 150,
						y: pagePoint.y - 150,
						props: {
							title: '',
							body: '',
							image: '',
							details: 'This is additional detail information that can be expanded.',
							card_type: selectedCardType,
							createdAt: creationTime,
						},
					},
				])
			}
		}
		
		// Add event listener to the canvas container with capture=true to run before tldraw's handlers
		const container = editor.getContainer()
		container.addEventListener('dblclick', handleDoubleClick, true)

		// Clean up on unmount
		return () => {
			container.removeEventListener('dblclick', handleDoubleClick, true)
		}

	}, [editor, sessionEnded])

	// Handle click in endSession mode
	useEffect(() => {
		if (!editor) return

		const handleClick = (e: MouseEvent) => {
			if (!sessionEnded) return
			
			// Convert screen coordinates to world coordinates
			const pagePoint = editor.screenToPage({ x: e.clientX, y: e.clientY })
			
			// Check if we clicked on a shape
			const hitShape = editor.getShapeAtPoint(pagePoint)
			if (hitShape) {
				if (hitShape.type == "card")
				{
					handleCardSelect(hitShape.id)
				}
				console.log('end session selected shape:', hitShape.id)
				return
			}
		}
		
		// Add event listener to the canvas container with capture=true to run before tldraw's handlers
		const container = editor.getContainer()
		container.addEventListener('click', handleClick, true)


		// Clean up on unmount
		return () => {
			container.removeEventListener('click', handleClick, true)
		}
	}, [editor, sessionEnded])

	//block translation in History view
	useEffect(() => {
		if (!editor) return
		const currentToolId = editor.getCurrentToolId();
		const checkAndRestrictTools = () => {
			const currentPageId = editor.getCurrentPageId()
			const currentPage = editor.getPages().find(page => page.id === currentPageId)
			const isHistoryView = currentPage && currentPage.name === "History"
			// console.log("current tool hey", editor.getPath());
			// If text tool (or other restricted tools) is active in History view, switch to select
			if ( editor.isIn('select.translating') && isHistoryView) { //potentially add more state here
				editor.setCurrentTool('hand');
				editor.setCurrentTool('select');
				editor.undo();
			}
		}

		// Listen to all store changes to catch tool changes
		const unsubscribe = editor.store.listen(() => {
			checkAndRestrictTools()
		})

		// Check immediately
		checkAndRestrictTools()

		return unsubscribe
	}, [editor])


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
					<Header
						intention={intention}
						setIntention={setIntention}
						timeRemaining={timeRemaining}
						currentPage={currentPage}
						onPageSwitch={switchToPage}
					/>
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
					
					{/* Session End Overlay */}
					{sessionEnded && (
						<SessionEndOverlay onFinishSession={handleFinishSession} />
					)}
				</div>
			)}
		</MantineProvider>
	)
}

/* 
Introduction:

This example shows how to create a custom shape, and add your own icon for it to the toolbar.
Check out CardShapeUtil.tsx and CardShapeTool.tsx to see how we define the shape util and tool. 
Check out ui-overrides.ts for more info on how to add your icon to the toolbar.

[1] 
We define an array to hold the custom shape util and custom tool. It's important to do this outside of
any React component so that this array doesn't get redefined on every render.

[2]
Now we'll pass these arrays into the Tldraw component's props, along with our ui overrides. */