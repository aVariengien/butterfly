import React, { useState } from 'react'
import {
	HTMLContainer,
	Rectangle2d,
	ShapeUtil,
	TLResizeInfo,
	resizeBox,
} from 'tldraw'
import { cardShapeMigrations } from './card-shape-migrations'
import { cardShapeProps } from './card-shape-props'
import { ICardShape } from './card-shape-types'
import { Paper, TextInput, Textarea, Button, Collapse, Image, ScrollArea, Text } from '@mantine/core'
import { getSelectedCardType } from './card-state'
import { getCardTypeColor, getCardTypeLayout } from '../utils/dynamicCardConfig'
import classes from '../styles/card.module.css'
import { useSessionContext } from '../contexts/SessionContext'
import { performFluidTypeChecking, generateImageForCard } from '../services/cardApiService'

// Session start time for consistent timestamp calculation
const SESSION_START_TIME = Date.now()

// Simple markdown renderer for basic formatting
const MarkdownText: React.FC<{ content: string }> = ({ content }) => {
	if (!content) return null
	
	return (
		<div style={{ fontSize: '0.75rem', lineHeight: '1.3', opacity: 0.8 }}>
			{content.split('\n').map((line, index) => {
				// Handle bold text **text**
				const parts = line.split(/(\*\*[^*]+\*\*)/)
				
				return (
					<div key={index} style={{ marginBottom: index < content.split('\n').length - 1 ? '0.4em' : 0 }}>
						{parts.map((part, partIndex) => {
							if (part.startsWith('**') && part.endsWith('**')) {
								// Bold text
								return <strong key={partIndex}>{part.slice(2, -2)}</strong>
							}
							return <span key={partIndex}>{part}</span>
						})}
					</div>
				)
			})}
		</div>
	)
}

const generateTitle = async (description: string): Promise<string> => {
	try {
		const response = await fetch('http://localhost:8000/generate-title', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ description }),
		})
		
		if (!response.ok) {
			throw new Error('Failed to generate title')
		}
		
		const data = await response.json()
		return data.title
	} catch (error) {
		console.error('Error generating title:', error)
		return ''
	}
}

// There's a guide at the bottom of this file!

export class CardShapeUtil extends ShapeUtil<ICardShape> {
	static override type = 'card' as const
	// [1]
	static override props = cardShapeProps
	// [2]
	static override migrations = cardShapeMigrations

	// [3]
	override isAspectRatioLocked(_shape: ICardShape) {
		return false
	}
	override canResize(_shape: ICardShape) {
		// Get the current page to check if we're in History view
		const currentPageId = this.editor.getCurrentPageId()
		const currentPage = this.editor.getPages().find(page => page.id === currentPageId)
		const isHistoryView = currentPage && currentPage.name === "History"
		
		// Disable resize in History view
		return !isHistoryView
	}

	// [4]
	getDefaultProps(): ICardShape['props'] {
		const selectedCardType = getSelectedCardType()
		// Calculate creation time as seconds since session start
		const creationTime = Math.floor((Date.now() - SESSION_START_TIME) / 1000)
		
		return {
			w: 250,
			h: 250,
			color: 'blue',
			body: '',
			title: '',
			img_prompt: '',
			img_source: '',
			extra_fields: {},
			card_type: selectedCardType,
			createdAt: creationTime,
			fluidErrors: [],
			lastValidationValue: '',
		}
	}

	// [5]
	getGeometry(shape: ICardShape) {
		return new Rectangle2d({
			width: shape.props.w,
			height: shape.props.h,
			isFilled: true,
		})
	}

	// [6]
	component(shape: ICardShape) {
		// eslint-disable-next-line react-hooks/rules-of-hooks
		const sessionContext = useSessionContext()
		// eslint-disable-next-line react-hooks/rules-of-hooks
		const [editingField, setEditingField] = useState<string | null>(null)
		
		const layout = getCardTypeLayout(shape.props.card_type)
		const borderColor = getCardTypeColor(shape.props.card_type)
		const toValidate = shape.props.toValidate || false
		const fluidErrors = shape.props.fluidErrors || []
		
		// Get the current page id
		const currentPageId = this.editor.getCurrentPageId()
		const currentPage = this.editor.getPages().find(page => page.id === currentPageId)
		const isActivePage = currentPage && currentPage.name === "Active"
		const isHistoryView = currentPage && currentPage.name === "History"

		// Session end state
		const { sessionEnded, selectedCards, onCardSelect } = sessionContext
		const isSelected = selectedCards.has(shape.id)
		const isSessionEndMode = sessionEnded && isActivePage // Don't apply session end logic to validation cards
		const handleTitleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
			if (isSessionEndMode || isHistoryView) return // Disable editing during session end
			this.editor.updateShape<ICardShape>({
				id: shape.id,
				type: shape.type,
				props: {
					...shape.props,
					title: event.target.value,
				},
			})
		}

		const handleTitleBlur = async () => {
			if (isSessionEndMode || isHistoryView) return // Disable editing during session end
			// Only generate title if current title is empty and card has title in layout and has body content
			if (!shape.props.title.trim() && layout.title && shape.props.body.trim()) {
				const generatedTitle = await generateTitle(shape.props.body)
				if (generatedTitle) {
					this.editor.updateShape<ICardShape>({
						id: shape.id,
						type: shape.type,
						props: {
							...shape.props,
							title: generatedTitle,
						},
					})
				}
			}
		}

		const handleBodyChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
			if (isSessionEndMode || isHistoryView) return // Disable editing during session end
			this.editor.updateShape<ICardShape>({
				id: shape.id,
				type: shape.type,
				props: {
					...shape.props,
					body: event.target.value,
				},
			})
		}

		const handleExtraFieldChange = (fieldName: string, value: string) => {
			if (isSessionEndMode || isHistoryView) return
			const updatedExtraFields = { ...shape.props.extra_fields, [fieldName]: value }
			this.editor.updateShape<ICardShape>({
				id: shape.id,
				type: shape.type,
				props: {
					...shape.props,
					extra_fields: updatedExtraFields || {},
				},
			})
		}

		const handleExtraFieldBlur = async (fieldName: string) => {
			if (isSessionEndMode || isHistoryView) return
			setEditingField(null)
			
			// Check for img_prompt field and generate image if changed
			if (fieldName === 'img_prompt') {
				const imgPrompt = shape.props.extra_fields?.[fieldName] || ''
				const currentPrompt = shape.props.img_prompt || ''
				
				// If prompt is empty, delete the image
				if (!imgPrompt && (currentPrompt || shape.props.img_source)) {
					console.log('Deleting image (empty prompt)')
					this.editor.updateShape<ICardShape>({
						id: shape.id,
						type: shape.type,
						props: {
							...shape.props,
							img_prompt: '',
							img_source: '',
						},
					})
				}
				// Only generate if prompt changed and is not empty
				else if (imgPrompt && imgPrompt !== currentPrompt) {
					console.log('Generating image for prompt:', imgPrompt)
					
					try {
						const imageUrl = await generateImageForCard(imgPrompt)
						if (imageUrl) {
							// Update card with new img_prompt and img_source
							this.editor.updateShape<ICardShape>({
								id: shape.id,
								type: shape.type,
								props: {
									...shape.props,
									img_prompt: imgPrompt,
									img_source: imageUrl,
								},
							})
							console.log('Image generated and card updated')
						}
					} catch (error) {
						console.error('Failed to generate image:', error)
					}
				}
			}
		}

		// Create card hash for change detection
		const createCardHash = (cardProps: any, code: string): string => {
			const content = {
				title: cardProps.title || '',
				body: cardProps.body || '', 
				extra_fields: cardProps.extra_fields || {},
				card_type: cardProps.card_type || '',
				img_prompt: cardProps.img_prompt || '',
				img_source: cardProps.img_source || '',
				code: code || ''
			}
			return btoa(JSON.stringify(content))
		}

		// Handle card blur event for fluid type checking
		const handleCardBlur = async () => {
			if (isSessionEndMode || isHistoryView || !sessionContext.sidepanelCode) return
			
			const currentHash = createCardHash(shape.props, sessionContext.sidepanelCode)
			
			// Skip if card hasn't changed since last validation
			if (shape.props.lastValidationValue === currentHash) {
				console.log('Card unchanged, skipping fluid type checking')
				return
			}

			try {
				console.log('Performing fluid type checking on card blur')
				const errors = await performFluidTypeChecking(shape.props, sessionContext.sidepanelCode)
				
				if (errors !== null) {
					// Update card with validation results
					this.editor.updateShape<ICardShape>({
						id: shape.id,
						type: shape.type,
						props: {
							...shape.props,
							fluidErrors: errors,
							lastValidationValue: currentHash,
							typecheckSuccess: errors.length === 0, // Set success if no errors
						},
					})
				}
			} catch (error) {
				console.error('Failed to perform fluid type checking:', error)
			}
		}

		const handleAccept = () => {
			this.editor.updateShape<ICardShape>({
				id: shape.id,
				type: shape.type,
				props: {
					...shape.props,
					toValidate: false,
					typecheckSuccess: true,
				},
			});
		}

		const handleReject = () => {
			this.editor.deleteShapes([shape.id])
		}

		const handleSessionEndClick = (e: React.MouseEvent) => {
			if (!isSessionEndMode) return
			console.log("card clicked");
			e.stopPropagation()
			e.preventDefault()
			onCardSelect(shape.id)
		}

		return (
			<HTMLContainer 
				id={shape.id}
				style={{
					pointerEvents: 'all',
					width: shape.props.w,
					height: shape.props.h,
				}}
			>
				<Paper 
					withBorder 
					radius="md" 
					className={classes.card}
					onBlur={!(isSessionEndMode || isHistoryView) ? handleCardBlur : undefined}
					onClick={handleSessionEndClick}
					style={{
						width: '100%',
						height: '100%',
						display: 'flex',
						flexDirection: 'column',
						borderColor: `var(--mantine-color-${borderColor}-4)`,
						borderWidth: '4px',
						opacity: isSessionEndMode ? (isSelected ? 1 : 0.4) : (toValidate ? 0.7 : 1),
						position: 'relative',
						cursor: isSessionEndMode ? 'pointer' : 'default',
						pointerEvents: (isSessionEndMode || isHistoryView) ? 'all' : undefined,
					}}
				>	
					{/* Validation overlay */}
					{toValidate && (
						<div
							style={{
								position: 'absolute',
								top: 0,
								left: 0,
								right: 0,
								bottom: 0,
								backgroundColor: 'rgba(149, 149, 149, 0.1)',
								borderRadius: '8px',
								pointerEvents: 'none',
								zIndex: 1,
							}}
						/>
					)}

					{/* Accept/Reject buttons for cards to validate */}
					{toValidate && (
						<div style={{ 
							position: 'absolute', 
							top: '8px', 
							right: '8px', 
							zIndex: 2,
							display: 'flex', 
							gap: '4px' 
						}}>
							<Button
								size="xs"
								variant="filled"
								color="green"
								onClick={handleAccept}
								onPointerDown={(e) => {
									e.stopPropagation()
									e.preventDefault()
								}}
								style={{ 
									fontSize: '10px',
									height: '20px',
									minWidth: '40px',
									padding: '0 6px',
								}}
							>
								✓
							</Button>
							<Button
								size="xs"
								variant="filled"
								color="red"
								onClick={handleReject}
								onPointerDown={(e) => {
									e.stopPropagation()
									e.preventDefault()
								}}
								style={{ 
									fontSize: '10px',
									height: '20px',
									minWidth: '40px',
									padding: '0 6px',
								}}
							>
								✗
							</Button>
						</div>
					)}
					
					{/* Image banner */}
					{layout.image && shape.props.img_source && (
						<Image
							alt="Card image"
							src={shape.props.img_source}
							style={{
								width: '100%',
								maxHeight: '150px',
								objectFit: 'scale-down',
								borderRadius: '4px 4px 0 0'
							}}
							onClick={handleSessionEndClick}
							onPointerDown={(e) => {
								e.stopPropagation()
								e.preventDefault()
							}}
						/>
					)}

					<div style={{ paddingTop: '10px', flex: 1, display: 'flex', flexDirection: 'column' }}>
						{/* Title */}
						{layout.title && (
							<Textarea
								size="lg"
								fw={700}
								mt={0}
								variant="unstyled"
								placeholder="Enter title..."
								value={shape.props.title}
								onChange={handleTitleChange}
								readOnly={(isSessionEndMode || isHistoryView)}
								minRows={1}
								autosize
								styles={{
									input: {
										fontSize: '1.2rem',
										fontWeight: 700,
										padding: 0,
										cursor: (isSessionEndMode || isHistoryView) ? 'pointer' : 'text',
										resize: 'none',
										wordWrap: 'break-word',
										whiteSpace: 'pre-wrap',
									}
								}}
							/>
						)}

						{/* Body */}
						{layout.body && (
							<Textarea
								size="sm"
								mt={0}
								variant="unstyled"
								placeholder="Enter description..."
								value={shape.props.body}
								onChange={handleBodyChange}
								minRows={1}
								autosize
								readOnly={(isSessionEndMode || isHistoryView)}
								styles={{
									input: {
										padding: 0,
										cursor: (isSessionEndMode || isHistoryView) ? 'pointer' : 'text',
									}
								}}
							/>
						)}

						{/* Extra fields section */}
						{layout.extra_fields && layout.extra_fields.map((fieldName) => (
							<div key={fieldName} style={{ marginTop: '8px' }}>
								<div style={{ fontSize: '0.7rem', fontWeight: 600, marginBottom: '2px', color: 'var(--mantine-color-gray-6)' }}>
									{fieldName}:
								</div>
								<Textarea
									size="sm"
									mt={0}
									variant="unstyled"
									placeholder={`Enter ${fieldName}...`}
									value={shape.props.extra_fields?.[fieldName] || ''}
									onChange={(event) => handleExtraFieldChange(fieldName, event.target.value)}
									onBlur={() => handleExtraFieldBlur(fieldName)}
									minRows={1}
									autosize
									readOnly={(isSessionEndMode || isHistoryView)}
									styles={{
										input: {
											padding: 0,
											cursor: (isSessionEndMode || isHistoryView) ? 'pointer' : 'text',
											fontSize: '0.75rem',
											lineHeight: '1.3',
											resize: 'none',
										}
									}}
								/>
							</div>
						))}

						{/* Fluid type checking errors */}
						{fluidErrors.length > 0 && (
							<div style={{ 
								marginTop: '8px',
								padding: '6px',
								backgroundColor: '#ffe6e6',
								border: '1px solid #ff6b6b',
								borderRadius: '4px',
								fontSize: '0.7rem',
								color: '#d63031',
								lineHeight: '1.2'
							}}>
								{fluidErrors.map((error, index) => (
									<div key={index} style={{ marginBottom: index < fluidErrors.length - 1 ? '4px' : 0 }}>
										<MarkdownText content={error} />
									</div>
								))}
							</div>
						)}
					</div>
					
					{/* Typecheck status/button - bottom left */}
					<div
						style={{
							position: 'absolute',
							bottom: '4px',
							left: '6px',
							display: 'flex',
							alignItems: 'center',
						}}
					>
						{shape.props.typecheckSuccess === true ? (
							// Green checkmark for successful typecheck
							<div
								style={{
									color: '#51cf66',
									fontSize: '16px',
									fontWeight: 'bold',
									opacity: 0.8,
								}}
								title="Type check passed"
							>
								✓
							</div>
						) : null}
					</div>
					
					{/* Card type label - bottom right */}
					<div
						style={{
							position: 'absolute',
							bottom: '4px',
							right: '6px',
							fontSize: '0.65rem',
							color: `var(--mantine-color-${borderColor}-6)`,
							fontWeight: 500,
							opacity: 0.7,
							pointerEvents: 'none',
							userSelect: 'none',
							textTransform: 'capitalize',
						}}
					>
						{shape.props.card_type}
					</div>
				</Paper>
			</HTMLContainer>
		)
	}

	// [7]
	indicator(shape: ICardShape) {
		return <rect width={shape.props.w} height={shape.props.h} />
	}

	// [8]
	override onResize(shape: ICardShape, info: TLResizeInfo<ICardShape>) {
		return resizeBox(shape, info)
	}
}
/* 
A utility class for the card shape. This is where you define the shape's behavior, 
how it renders (its component and indicator), and how it handles different events.

[1]
A validation schema for the shape's props (optional)
Check out card-shape-props.ts for more info.

[2]
Migrations for upgrading shapes (optional)
Check out card-shape-migrations.ts for more info.

[3]
Letting the editor know if the shape's aspect ratio is locked, and whether it 
can be resized or bound to other shapes. 

[4]
The default props the shape will be rendered with when click-creating one.

[5]
We use this to calculate the shape's geometry for hit-testing, bindings and
doing other geometric calculations. 

[6]
Render method — the React component that will be rendered for the shape. It takes the 
shape as an argument. HTMLContainer is just a div that's being used to wrap our text 
and button. We can get the shape's bounds using our own getGeometry method.
	
- [a] Check it out! We can do normal React stuff here like using setState.
   Annoying: eslint sometimes thinks this is a class component, but it's not.

- [b] You need to stop the pointer down event on buttons, otherwise the editor will
	   think you're trying to select drag the shape.

[7]
Indicator — used when hovering over a shape or when it's selected; must return only SVG elements here

[8]
Resize handler — called when the shape is resized. Sometimes you'll want to do some 
custom logic here, but for our purposes, this is fine.
*/