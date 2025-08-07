import { useEffect } from 'react'
import { Editor } from 'tldraw'
import { isCurrentPage } from '../utils/shapeUtils'

export function useTldrawRestrictions(editor: Editor | null) {
	// Block translation and tool usage in History view
	useEffect(() => {
		if (!editor) return
		
		const checkAndRestrictTools = () => {
			const isHistoryView = isCurrentPage(editor, 'History')
			
			// If text tool (or other restricted tools) is active in History view, switch to select
			if (editor.isIn('select.translating') && isHistoryView) {
				editor.setCurrentTool('hand')
				editor.setCurrentTool('select')
				editor.undo()
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
}