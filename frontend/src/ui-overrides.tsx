import React, { useState } from 'react'
import {
	DefaultKeyboardShortcutsDialog,
	DefaultKeyboardShortcutsDialogContent,
	DefaultToolbar,
	DefaultToolbarContent,
	TLComponents,
	TLUiOverrides,
	TldrawUiMenuItem,
	useIsToolSelected,
	useTools,
	useEditor,
} from 'tldraw'
import { SegmentedControl } from '@mantine/core'
import { CardType } from './card-shape-types'
import { CardTypeToLayout } from './card-config'
import { getSelectedCardType, setSelectedCardType } from './card-state'

// There's a guide at the bottom of this file!

// Card type selector component
export function CardTypeSelector() {
	const editor = useEditor()
	const [selectedCardType, setLocalSelectedCardType] = useState<CardType>(getSelectedCardType())

	const handleCardTypeChange = (value: string) => {
		const cardType = value as CardType
		setLocalSelectedCardType(cardType)
		setSelectedCardType(cardType) // Update global state
		
		// Update all selected card shapes to the new type
		const selectedShapes = editor.getSelectedShapes()
		const cardShapes = selectedShapes.filter(shape => shape.type === 'card')
		
		cardShapes.forEach(shape => {
			editor.updateShape({
				id: shape.id,
				type: 'card',
				props: {
					...shape.props,
					card_type: cardType,
				}
			})
		})
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
				color="red"
				size="sm"
			/>
		</div>
	)
}

export const uiOverrides: TLUiOverrides = {
	// Remove custom tools since we won't use the toolbar
	tools(editor, tools) {
		console.log(tools)
		return {
			select: tools.select,
			hand: tools.hand,
		}
	}
}

export const components: TLComponents = {
	Toolbar: null, // Hide the toolbar completely
	StylePanel: null, // Hide the style/color panel
	ActionsMenu: null, // Hide the actions menu
	HelpMenu: null, // Hide the help menu
	MainMenu: null, // Hide the main menu
	NavigationPanel: null, // Hide the navigation panel
	PageMenu: null, // Hide the page menu
	QuickActions: null, // Hide quick actions
	KeyboardShortcutsDialog: null, // Hide keyboard shortcuts dialog
	InFrontOfTheCanvas: () => {
		return <CardTypeSelector />
	},
}

/* 

This file contains overrides for the Tldraw UI. These overrides are used to add your custom tools to
the toolbar and the keyboard shortcuts menu.

First we have to add our new tool to the tools object in the tools override. This is where we define
all the basic information about our new tool - its icon, label, keyboard shortcut, what happens when
we select it, etc.

Then, we replace the UI components for the toolbar and keyboard shortcut dialog with our own, that
add our new tool to the existing default content. Ideally, we'd interleave our new tool into the
ideal place among the default tools, but for now we're just adding it at the start to keep things
simple.
*/