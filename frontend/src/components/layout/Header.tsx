import React from 'react'
import { TextInput, Text, Button, ActionIcon } from '@mantine/core'
import { IconDownload, IconUpload } from '@tabler/icons-react'
import { HeaderProps } from '../../types/session'
import { formatTime } from '../../utils/timeUtils'
import { HEADER_HEIGHT } from '../../utils/constants'

export function Header({ 
	intention, 
	setIntention,
	timeRemaining,
	currentPage,
	onPageSwitch,
	onEndSession,
	onDownload,
	onUpload,
	style
}: HeaderProps) {
	return (
		<div
			style={{
				position: 'fixed',
				top: 0,
				left: 0,
				right: 0,
				height: HEADER_HEIGHT,
				background: 'linear-gradient(90deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.6) 100%)',
				backdropFilter: 'blur(10px)',
				zIndex: 1000,
				display: 'flex',
				alignItems: 'center',
				padding: '0 20px',
				...style
			}}
		>
			<span
				style={{
					fontFamily: '"Montserrat", serif',
					fontSize: '1.2rem',
					color: 'white',
				}}
			>
				There is something about
			</span>
			<TextInput
				variant="header"
				placeholder="..."
				value={intention}
				onChange={(e) => setIntention(e.target.value)}
			/>
			
			{/* Page Navigation */}
			<div style={{ marginLeft: 'auto', marginRight: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
				{onUpload && (
					<ActionIcon
						component="label"
						variant="outline"
						size="sm"
						style={{
							borderColor: 'white',
							color: 'white',
						}}
						title="Load Board State"
					>
						<IconUpload size={16} />
						<input
							type="file"
							accept=".json"
							style={{ display: 'none' }}
							onChange={onUpload}
						/>
					</ActionIcon>
				)}
				{onDownload && (
					<ActionIcon
						variant="outline"
						size="sm"
						onClick={onDownload}
						style={{
							borderColor: 'white',
							color: 'white',
						}}
						title="Download Board State"
					>
						<IconDownload size={16} />
					</ActionIcon>
				)}
				<Button
					variant={currentPage === 'active' ? 'filled' : 'outline'}
					size="sm"
					onClick={() => onPageSwitch('active')}
					style={{
						backgroundColor: currentPage === 'active' ? 'white' : 'transparent',
						color: currentPage === 'active' ? 'black' : 'white',
						borderColor: 'white',
					}}
				>
					Active Page
				</Button>
				<Button
					variant={currentPage === 'history' ? 'filled' : 'outline'}
					size="sm"
					onClick={() => onPageSwitch('history')}
					style={{
						backgroundColor: currentPage === 'history' ? 'white' : 'transparent',
						color: currentPage === 'history' ? 'black' : 'white',
						borderColor: 'white',
					}}
				>
					History Page
				</Button>
				{onEndSession && (
					<Button
						variant="outline"
						size="sm"
						onClick={onEndSession}
						style={{
							backgroundColor: 'transparent',
							color: '#ff6b6b',
							borderColor: '#ff6b6b',
							marginLeft: '10px',
						}}
					>
						End Session
					</Button>
				)}
			</div>
			
			{/* Session Timer */}
			{timeRemaining !== null && (
				<div style={{ display: 'flex', alignItems: 'center' }}>
					<Text 
						style={{
							fontFamily: '"Montserrat", serif',
							fontSize: '1.2rem',
							color: timeRemaining <= 60 ? '#ff6b6b' : 'white', // Red when less than 1 minute
							fontWeight: 600,
							textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
						}}
					>
						{formatTime(timeRemaining)}
					</Text>
				</div>
			)}
		</div>
	)
}