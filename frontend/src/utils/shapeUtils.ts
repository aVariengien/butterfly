import { Editor } from 'tldraw'

// Clean up text shapes on current page
export function deleteTextShapes(editor: Editor): number {
	const shapes = editor.getCurrentPageShapes()
	const textShapes = shapes.filter(shape => shape.type === 'text')
	
	if (textShapes.length > 0) {
		editor.deleteShapes(textShapes.map(shape => shape.id))
		console.log(`Deleted ${textShapes.length} text shapes from current page`)
	}
	
	return textShapes.length
}


// Get page by name
export function getPageByName(editor: Editor, name: string) {
	const pages = editor.getPages()
	return pages.find(page => page.name === name)
}

// Check if current page matches name
export function isCurrentPage(editor: Editor, name: string): boolean {
	const currentPageId = editor.getCurrentPageId()
	const currentPage = editor.getPages().find(page => page.id === currentPageId)
	return currentPage?.name === name
}