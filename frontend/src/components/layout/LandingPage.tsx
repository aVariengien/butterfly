import React from 'react'
import { TextInput, Text, Slider } from '@mantine/core'
import { LandingPageProps } from '../../types/session'

export function LandingPage({ 
	intention, 
	setIntention,
	sessionDuration,
	setSessionDuration,
	onEnter 
}: LandingPageProps) {
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
						min={0.2}
						max={20}
						step={0.1}
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