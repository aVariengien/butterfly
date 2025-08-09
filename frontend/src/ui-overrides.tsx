import React from 'react'
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
} from 'tldraw'
import { CardTypeSelector } from './components/CardTypeSelector'

// There's a guide at the bottom of this file!


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