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
import { Paper, TextInput, Textarea, Button, Collapse, Image, ScrollArea } from '@mantine/core'
import { CardTypeToColors, CardTypeToLayout } from './card-config'
import { DEFAULT_TEST_IMAGE } from './test-image'
import { getSelectedCardType } from './card-state'
import classes from './card.module.css'

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
		return true
	}

	// [4]
	getDefaultProps(): ICardShape['props'] {
		const selectedCardType = getSelectedCardType()
		return {
			w: 300,
			h: 300,
			color: 'blue',
			body: '',
			title: '',
			image: DEFAULT_TEST_IMAGE,
			details: 'This is additional detail information that can be expanded.',
			card_type: selectedCardType,
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
		const [detailsExpanded, setDetailsExpanded] = useState(false)
		
		const layout = CardTypeToLayout[shape.props.card_type]
		const borderColor = CardTypeToColors[shape.props.card_type]

		const handleTitleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
			this.editor.updateShape<ICardShape>({
				id: shape.id,
				type: shape.type,
				props: {
					...shape.props,
					title: event.target.value,
				},
			})
		}

		const handleBodyChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
			this.editor.updateShape<ICardShape>({
				id: shape.id,
				type: shape.type,
				props: {
					...shape.props,
					body: event.target.value,
				},
			})
		}

		const handleDetailsChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
			this.editor.updateShape<ICardShape>({
				id: shape.id,
				type: shape.type,
				props: {
					...shape.props,
					details: event.target.value,
				},
			})
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
					style={{
						width: '100%',
						height: '100%',
						display: 'flex',
						flexDirection: 'column',
						borderColor: `var(--mantine-color-${borderColor}-4)`,
						borderWidth: '4px',
					}}
				>	
					{/* Image banner */}
					{layout.image && shape.props.image && (
						<Image
							src={shape.props.image}
							alt="Card image"
							style={{
								width: '100%',
								maxHeight: '100px',
								objectFit: 'cover',
								borderRadius: '4px 4px 0 0'
							}}
							onPointerDown={(e) => e.stopPropagation()}
						/>
					)}

					<div style={{ padding: '12px', flex: 1, display: 'flex', flexDirection: 'column' }}>
						{/* Title */}
						{layout.title && (
							<TextInput
								size="lg"
								fw={700}
								mt={0}
								variant="unstyled"
								placeholder="Enter title..."
								value={shape.props.title}
								onChange={handleTitleChange}
								onPointerDown={(e) => e.stopPropagation()}
								styles={{
									input: {
										fontSize: '1.2rem',
										fontWeight: 700,
										padding: 0,
									}
								}}
							/>
						)}

						{/* Body */}
						{layout.body && (
							<Textarea
								size="sm"
								mt={layout.title ? "sm" : 0}
								variant="unstyled"
								placeholder="Enter description..."
								value={shape.props.body}
								onChange={handleBodyChange}
								onPointerDown={(e) => e.stopPropagation()}
								minRows={2}
								autosize
								styles={{
									input: {
										padding: 0,
									}
								}}
							/>
						)}

						{/* Details section */}
						{layout.details && (
							<>
							<div style={{ marginTop: '8px' }}>
								<Button
									variant="subtle"
									size="xs"
									onClick={() => setDetailsExpanded(!detailsExpanded)}
									onPointerDown={(e) => {
										e.stopPropagation()
										e.preventDefault()
									}}
									onPointerUp={(e) => {
										e.stopPropagation()
										e.preventDefault()
									}}
									onMouseDown={(e) => {
										e.stopPropagation()
										e.preventDefault()
									}}
									onMouseUp={(e) => {
										e.stopPropagation()
										e.preventDefault()
									}}
									style={{ 
										padding: 0, 
										height: 'auto', 
										fontWeight: 'normal',
										userSelect: 'none',
										pointerEvents: 'all'
									}}
								>
									{detailsExpanded ? 'Less' : 'More'}
								</Button>
								</div>
								<div>
								
								<Collapse in={detailsExpanded}>
										<Textarea
											size="xs"
											variant="unstyled"
											placeholder="Enter additional details..."
											value={shape.props.details}
											onChange={handleDetailsChange}
											onPointerDown={(e) => e.stopPropagation()}
											minRows={3}
											autosize
											styles={{
												input: {
													padding: 0,
													fontSize: '0.875rem',
												}
											}}
										/>
								</Collapse>
							</div>
							</>
						)}
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