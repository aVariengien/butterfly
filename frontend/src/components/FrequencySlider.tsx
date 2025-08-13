import React from 'react'
import { Slider, Text, Box } from '@mantine/core'

interface FrequencySliderProps {
	frequency: number
	onChange: (frequency: number) => void
}

export function FrequencySlider({ frequency, onChange }: FrequencySliderProps) {
	// Convert frequency value to display text
	const getFrequencyText = (value: number) => {
		if (value >= 20000000) return 'Never'
		if (value === 1) return '1s'
		if (value <= 60) return `${value}s`
		return `${Math.round(value / 60)}m`
	}

	const getSliderValue = (freq: number) => {
		if (freq == 80) {
			return 20000000
		}
		else {
			return freq
		}
	}

	// Convert slider value to frequency
	const handleSliderChange = (sliderValue: number) => {
		const actualFrequency = sliderValue === 80 ? 20000000 : sliderValue
		onChange(actualFrequency)
	}

	// Convert frequency to slider value for display


	// Slider marks for key intervals
	const marks = [
		{ value: 1, label: '1s' },
		{ value: 60, label: '1m' },
		{ value: 80, label: 'Never' }
	]

	return (
		<Box
			style={{
				position: 'fixed',
				bottom: 20,
				left: 20,
				width: 200,
				padding: 16,
				borderRadius: 8,
				color: 'white',
				zIndex: 1000
			}}
		>
			<Slider
				value={getSliderValue(frequency)}
				onChange={handleSliderChange}
				showLabelOnHover={false}
				min={1}
				max={80}
				step={1}
				marks={marks}
				styles={{
					track: { backgroundColor: 'rgb(194, 194, 194)' },
					bar: { backgroundColor: 'rgb(194, 194, 194)' },
					thumb: { backgroundColor: 'rgb(194, 194, 194)', borderColor: 'rgb(194, 194, 194)' },
					mark: { backgroundColor: 'rgb(194, 194, 194)' },
					markLabel: { color: 'rgb(194, 194, 194)', fontSize: 10 },
					label: {opacity: '0'}
				}}
			/>
		</Box>
	)
}