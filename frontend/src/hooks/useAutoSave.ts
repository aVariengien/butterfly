import { useEffect, useRef } from 'react'
import { Editor } from 'tldraw'

interface BoardState {
  intention: string
  sessionDuration: number
  timestamp: string
  cards: any[]
}

export const useAutoSave = (
  editor: Editor | null,
  intention: string,
  sessionDuration: number
) => {
  const lastStateRef = useRef<string>('')
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const getBoardState = (): BoardState | null => {
    if (!editor) return null

    // Get all shapes from current page
    const shapes = editor.getCurrentPageShapes()
    const cards = shapes
      .filter(shape => shape.type === 'card')
      .map(shape => {
        const props = shape.props as any
        return {
          w: props.w || 300,
          h: props.h || 300,
          x: shape.x,
          y: shape.y,
          title: props.title || '',
          body: props.body || '',
          card_type: props.card_type || '',
          img_prompt: props.img_prompt || '',
          img_source: props.img_source || '',
          details: props.details || '',
          createdAt: props.createdAt || Math.floor(Date.now() / 1000)
        }
      })

    return {
      intention,
      sessionDuration,
      timestamp: new Date().toISOString(),
      cards
    }
  }

  const saveToFile = async (boardState: BoardState) => {
    try {
      const dataStr = JSON.stringify(boardState, null, 2)
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const filename = `butterfly-auto-save-${timestamp}.json`
      
      // For browser environment, we'll save to downloads folder
      // since we can't directly write to specific folders
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      console.log(`Auto-saved whiteboard state to ${filename}`)
    } catch (error) {
      console.error('Failed to auto-save whiteboard state:', error)
    }
  }

  const checkAndSave = () => {
    const currentState = getBoardState()
    if (!currentState) return

    const currentStateStr = JSON.stringify(currentState.cards)
    
    // Only save if the state has changed
    if (currentStateStr !== lastStateRef.current) {
      lastStateRef.current = currentStateStr
      saveToFile(currentState)
    }
  }

  useEffect(() => {
    if (!editor) return

    // Set up interval to check every 5 minutes (300,000 ms)
    intervalRef.current = setInterval(checkAndSave, 5 * 60 * 1000)

    // Initial state capture
    const initialState = getBoardState()
    if (initialState) {
      lastStateRef.current = JSON.stringify(initialState.cards)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [editor, intention, sessionDuration])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])
}