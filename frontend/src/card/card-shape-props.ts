
import { DefaultColorStyle, RecordProps, T } from 'tldraw'
import { ICardShape, TCardType } from './card-shape-types'

// Validation for our custom card shape's props, using one of tldraw's default styles
export const cardShapeProps: RecordProps<ICardShape> = {
	w: T.number,
	h: T.number,
	color: DefaultColorStyle,
	title: T.string,
	body: T.string,
	image: T.optional(T.string),
	details: T.optional(T.string),
	card_type: TCardType,
	toValidate: T.optional(T.boolean),
	createdAt: T.optional(T.number),
	fluidErrors: T.optional(T.arrayOf(T.string)),
	lastValidationValue: T.optional(T.string),
}
