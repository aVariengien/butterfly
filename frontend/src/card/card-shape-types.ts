import { TLBaseShape, TLDefaultColorStyle } from 'tldraw'
import { T } from 'tldraw'
// Card type definitions
export type CardType = string
export const TCardType = T.string
// A type for our custom card shape
export type ICardShape = TLBaseShape<
	'card',
	{
		w: number
		h: number
		color: TLDefaultColorStyle,
		title: string,
		body: string,
		img_prompt?: string, // text prompt for image generation
		img_source?: string, // URL or base64 image data
		details?: string, // expandable details text
		card_type: string,
		toValidate?: boolean, // flag to show accept/reject buttons
		createdAt?: number, // seconds since session start
		fluidErrors?: string[], // fluid type checking errors
		lastValidationValue?: string, // cached hash of card for change detection
		typecheckSuccess?: boolean, // whether typecheck passed successfully
	}
>