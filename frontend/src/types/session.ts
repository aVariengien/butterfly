// Types for generated cards
export interface GeneratedCard {
	id: string
	w: number
	h: number
	x: number
	y: number
	title: string
	body: string
	img_prompt?: string
	img_source?: string
	details?: string
	card_type: string
	createdAt?: number
}

// Session management types
export interface SessionState {
	sessionEnded: boolean
	sessionNumber: number
	selectedCards: Set<string>
	currentPage: 'active' | 'history'
	sessionEndTime: number | null
	timeRemaining: number | null
}

// Landing page props
export interface LandingPageProps {
	intention: string
	setIntention: (value: string) => void
	sessionDuration: number
	setSessionDuration: (value: number) => void
	onEnter: () => void
}

// Header props
export interface HeaderProps {
	intention: string
	setIntention: (value: string) => void
	timeRemaining: number | null
	currentPage: 'active' | 'history'
	onPageSwitch: (page: 'active' | 'history') => void
	onEndSession?: () => void
	onDownload?: () => void // Download board state function
	onUpload?: (event: React.ChangeEvent<HTMLInputElement>) => void // Upload board state function
	style?: React.CSSProperties
}