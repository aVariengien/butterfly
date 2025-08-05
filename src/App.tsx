import React, { useState } from 'react'
import { MantineProvider, SegmentedControl } from '@mantine/core'
import '@mantine/core/styles.css'
import { Tldraw, createShapeId } from 'tldraw'
import 'tldraw/tldraw.css'
import { CardShapeUtil } from './CardShapeUtil'
import { getSelectedCardType, setSelectedCardType } from './card-state'
import { CardType } from './card-shape-types'
import { CardTypeToLayout } from './card-config'
import { DEFAULT_TEST_IMAGE } from './test-image'

// There's a guide at the bottom of this file!

// [1]
const customShapeUtils = [CardShapeUtil]
// No custom tools - use default tldraw tools

// Simple card type selector that doesn't use useEditor hook
function SimpleCardTypeSelector() {
	const [selectedCardType, setLocalSelectedCardType] = useState<CardType>(getSelectedCardType())

	const handleCardTypeChange = (value: string) => {
		const cardType = value as CardType
		setLocalSelectedCardType(cardType)
		setSelectedCardType(cardType) // Update global state
	}

	const cardTypeOptions = Object.keys(CardTypeToLayout).map(type => ({
		value: type,
		label: type.charAt(0).toUpperCase() + type.slice(1)
	}))

	return (
		<div style={{
			position: 'fixed',
			bottom: '20px',
			left: '50%',
			transform: 'translateX(-50%)',
			zIndex: 1000,
			backgroundColor: 'rgba(255, 255, 255, 0.95)',
			padding: '10px',
			borderRadius: '8px',
			boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
		}}>
			<SegmentedControl
				value={selectedCardType}
				onChange={handleCardTypeChange}
				data={cardTypeOptions}
				color="blue"
				size="sm"
			/>
		</div>
	)
}

// UI overrides to hide all default components
const uiOverrides = {
	// Remove custom tools since we won't use the toolbar
}

const components = {
	Toolbar: null, // Hide the toolbar completely
	StylePanel: null, // Hide the style/color panel
	ActionsMenu: null, // Hide the actions menu
	HelpMenu: null, // Hide the help menu
	MainMenu: null, // Hide the main menu
	NavigationPanel: null, // Hide the navigation panel
	PageMenu: null, // Hide the page menu
	QuickActions: null, // Hide quick actions
	KeyboardShortcutsDialog: null, // Hide keyboard shortcuts dialog
	InFrontOfTheCanvas: () => <SimpleCardTypeSelector />,
}

// [2]
export default function CustomConfigExample() {
	return (
		<MantineProvider>
			<div style={{ position: 'fixed', inset: 0 }}>
				<Tldraw
					shapeUtils={customShapeUtils}
					overrides={uiOverrides}
					components={components}
					onMount={(editor) => {
						console.log('Editor mounted')
						console.log('Current tool:', editor.getCurrentToolId())
						
						// Add double-click event listener for card creation
						const handleDoubleClick = (e: MouseEvent) => {
							console.log('Double-click detected on canvas', e)
							
							// Prevent default tldraw behavior
							e.preventDefault()
							e.stopPropagation()
							e.stopImmediatePropagation()
							
							// Convert screen coordinates to world coordinates
							const pagePoint = editor.screenToPage({ x: e.clientX, y: e.clientY })
							
							// Check if we clicked on a shape
							const hitShape = editor.getShapeAtPoint(pagePoint)
							if (hitShape) {
								// Double-click on shape - delete it
								console.log('Deleting shape:', hitShape.id)
								editor.deleteShapes([hitShape.id])
								return
							}
							
							// Double-click on empty canvas - create card
							const selectedCardType = getSelectedCardType()
							console.log('Creating card at:', pagePoint, 'type:', selectedCardType)
							
							editor.createShapes([
								{
									id: createShapeId(),
									type: 'card',
									x: pagePoint.x - 150,
									y: pagePoint.y - 150,
									props: {
										w: 300,
										h: 300,
										color: 'blue',
										title: '',
										body: '',
										image: DEFAULT_TEST_IMAGE,
										details: 'This is additional detail information that can be expanded.',
										card_type: selectedCardType,
									},
								},
							])
						}
						
						// Add event listener to the canvas container with capture=true to run before tldraw's handlers
						const container = editor.getContainer()
						container.addEventListener('dblclick', handleDoubleClick, true)
						
						// Clean up on unmount (though this won't be called in this setup)
						return () => {
							container.removeEventListener('dblclick', handleDoubleClick, true)
						}
					}}
				/>
			</div>
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
Now we'll pass these arrays into the Tldraw component's props, along with our ui overrides.


*/