import { Editor, createShapeId } from 'tldraw'
import { getPageByName } from '../utils/shapeUtils'
import { SESSION_SPACING, SESSION_BASE_Y, CARD_PADDING } from '../utils/constants'

// Initialize pages when editor is ready
export function initializePages(editorInstance: Editor) {
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
}

// Switch between Active and History pages
export function switchToPage(editor: Editor, pageName: 'active' | 'history'): boolean {
	const targetPageName = pageName === 'active' ? 'Active' : 'History'
	const targetPage = getPageByName(editor, targetPageName)
	
	if (targetPage) {
		editor.setCurrentPage(targetPage.id)
		return true
	}
	return false
}

// Archive current session to history page
export function archiveCurrentSession(editor: Editor, sessionNumber: number): void {
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
	const historyPage = getPageByName(editor, 'History')
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

	const nextX = lastXValue + lastWidth + SESSION_SPACING // Space between sessions
	
	// Create session rectangle and label
	const sessionRectId = createShapeId()
	const sessionLabelId = createShapeId()
	
	editor.createShapes([
		// Session rectangle
		{
			id: sessionRectId,
			type: 'geo',
			x: nextX,
			y: SESSION_BASE_Y,
			props: {
				w: sessionWidth,
				h: sessionHeight,
				geo: 'rectangle',
				color: 'grey',
				fill: 'none',
				dash: 'solid',
			},
		},
		// Session label using text shape
		{
			id: sessionLabelId,
			type: 'text',
			x: nextX,
			y: SESSION_BASE_Y - 30,
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
				x: nextX + (shape.x - bounds.minX) + CARD_PADDING, // Offset within session rectangle
				y: SESSION_BASE_Y + (shape.y - bounds.minY) + CARD_PADDING,
				props: {
					...shape.props as any,
					toValidate: false,
				},
			}])
		}
	}
	
	// Switch back to active page
	editor.setCurrentPage(currentPageId)
	
	console.log(`Archived session ${sessionNumber} with ${cardShapes.length} cards`)
}