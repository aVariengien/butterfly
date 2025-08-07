import React from 'react'
import { Button, Text } from '@mantine/core'

interface SessionEndOverlayProps {
	onFinishSession: () => void
}

export function SessionEndOverlay({ onFinishSession }: SessionEndOverlayProps) {
	return (
		<>
			{/* Semi-transparent background that doesn't block interaction */}
			<div
				style={{
					position: 'fixed',
					inset: 0,
					zIndex: 1,
					pointerEvents: 'none'
				}}
			/>
			
			{/* Message and button positioned as medium-size box near bottom of header */}
			<div
				style={{
					position: 'fixed',
					top: '70px',
					left: '50%',
					transform: 'translateX(-50%)',
					zIndex: 1001,
					pointerEvents: 'auto',
					backgroundColor: 'white',
					borderRadius: '12px',
					boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
					border: '1px solid rgba(0, 0, 0, 0.1)',
				}}
			>
			<div style={{ 
				textAlign: 'center', 
				width: '500px', 
				padding: '16px 24px',
				display: 'flex',
				flexDirection: 'column',
				gap: '12px'
			}}>
				<Text
					size="lg"
					style={{
						fontFamily: '"Montserrat", serif',
						fontSize: '1rem',
						fontWeight: 500,
						color: 'black',
						lineHeight: 1.3,
					}}
				>
					Which cards do you resonate with?
				</Text>
				
				<Text
					size="sm"
					style={{
						fontFamily: '"Montserrat", serif',
						color: 'rgba(29, 29, 29, 0.7)',
						fontStyle: 'italic',
						fontSize: '0.8rem',
					}}
				>
					Click on the cards you want to keep for the next session
				</Text>

				<Button
					variant="filled"
					size="s"
					onClick={onFinishSession}
					style={{
						fontFamily: '"Montserrat", serif',
						fontSize: '0.8rem',
						padding: '10px 24px',
						backgroundColor: 'black',
						color: 'white',
						alignSelf: 'center',
						marginTop: '4px',
					}}
				>
					Finish Session
				</Button>
			</div>
			</div>
		</>
	)
}