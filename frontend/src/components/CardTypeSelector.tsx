import React, { useState, useEffect } from 'react'
import { useEditor } from 'tldraw'
import { SegmentedControl } from '@mantine/core'
import { CardType } from '../card/card-shape-types'
import { getSelectedCardType, setSelectedCardType } from '../card/card-state'
import { getCardTypeNames } from '../utils/dynamicCardConfig'

export function CardTypeSelector() {
	const editor = useEditor()
	const [selectedCardType, setLocalSelectedCardType] = useState<CardType>(getSelectedCardType())
	const [cardTypeOptions, setCardTypeOptions] = useState(() => {
		return getCardTypeNames().map(type => ({
			value: type,
			label: type.charAt(0).toUpperCase() + type.slice(1)
		}))
	})

	// Listen for card type updates
	useEffect(() => {
		const handleCardTypesUpdate = () => {
			const newOptions = getCardTypeNames().map(type => ({
				value: type,
				label: type.charAt(0).toUpperCase() + type.slice(1)
			}))
			setCardTypeOptions(newOptions)
		}

		window.addEventListener('cardTypesUpdated', handleCardTypesUpdate)
		return () => window.removeEventListener('cardTypesUpdated', handleCardTypesUpdate)
	}, [])

	const handleCardTypeChange = (value: string) => {
		const cardType = value as CardType
		setLocalSelectedCardType(cardType)
		setSelectedCardType(cardType) // Update global state
	}

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