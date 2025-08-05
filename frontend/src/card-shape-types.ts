import { TLBaseShape, TLDefaultColorStyle } from 'tldraw'
import { T } from 'tldraw'
// Card type definitions
export type CardType = 'example' | 'question' | 'idea'
export const TCardType = T.literalEnum('example', 'question', 'idea')
// A type for our custom card shape
export type ICardShape = TLBaseShape<
	'card',
	{
		w: number
		h: number
		color: TLDefaultColorStyle,
		title: string,
		body: string,
		image?: string, // base64 image data
		details?: string, // expandable details text
		card_type: CardType,
	}
>