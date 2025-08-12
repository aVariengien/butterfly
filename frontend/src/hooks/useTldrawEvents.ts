import { useEffect } from 'react'
import { Editor, createShapeId } from 'tldraw'
import { getSelectedCardType } from '../card/card-state'
import { deleteTextShapes, isCurrentPage } from '../utils/shapeUtils'
import { SESSION_START_TIME } from '../utils/constants'

export function useTldrawEvents(
	editor: Editor | null,
	sessionEnded: boolean,
	handleCardSelect: (cardId: string) => void
) {
	// Handle double-click for card creation and text cleanup
	useEffect(() => {
		if (!editor) return

		const handleDoubleClick = (e: MouseEvent) => {
			// Get current page to check if we're in History view
			const isHistoryView = isCurrentPage(editor, 'History')
		
			// Prevent all double-click behavior in History view or during session end
			if (isHistoryView || sessionEnded) {
				e.stopPropagation()
				e.preventDefault()
				e.stopImmediatePropagation()
				editor.setCurrentTool("hand")
				editor.setCurrentTool("select")
				return
			}
			
			// Prevent default tldraw behavior only when creating cards
			e.stopPropagation()
			e.preventDefault()
			e.stopImmediatePropagation()

			// Scan and delete all text shapes on current page
			deleteTextShapes(editor)

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
							img_prompt: '',
							img_source: '',
							details: '',
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
				if (hitShape.type === "card") {
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
	}, [editor, sessionEnded, handleCardSelect])
}