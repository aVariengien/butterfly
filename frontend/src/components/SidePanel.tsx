import React, { useState, useEffect } from 'react'
import { Paper, Title, Button, ActionIcon, Box, Alert } from '@mantine/core'
import { IconChevronLeft, IconChevronRight, IconAlertCircle } from '@tabler/icons-react'
import CodeEditor from '@uiw/react-textarea-code-editor'
import { HEADER_HEIGHT } from '../utils/constants'
import rehypePrismPlus from 'rehype-prism-plus';

interface SidePanelProps {
  onUpdateTypes?: (cardTypes: { colors: Record<string, string>, layouts: Record<string, Record<string, boolean>> }) => void
  onCodeChange?: (code: string) => void
}

export const SidePanel: React.FC<SidePanelProps> = ({ onUpdateTypes, onCodeChange }) => {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [currentCode, setCurrentCode] = useState(`# Define your card types using Pydantic classes
# Each class should inherit from Card
# Available: Card, BaseModel, Field, Optional

class Example(Card):
    """A concrete example."""
    title: str = Field(..., description="A short title defining the card")
    body: str = Field(..., description="The body of the example, in 1-2 sentences.")
    details: Optional[str] = Field("", description="Additional details when more space is needed.")
    img_prompt: str = Field(..., description="Text prompt for generating an image for this example")
    img_source: Optional[str] = Field(None, description="URL or base64 data of the example's image")

class Idea(Card):
    """A card representing a concrete idea."""
    title: str = Field(..., description="A short title defining the card")
    body: str = Field(..., description="The short description of the idea in 1-2 sentences.")

class Question(Card):
    """A card representing a question."""
    title: str = Field(..., description="A short title defining the card")
    body: None  # No body for questions

class Task(Card):
    """A task or todo item."""
    title: str = Field(..., description="Task title")
    body: str = Field(..., description="Task description")
    details: Optional[str] = Field(None, description="Additional task details")`)
  const [codeInput, setCodeInput] = useState(currentCode)  // This is the "committed" code used for generation
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Notify parent when committed code changes (only on button click)
  useEffect(() => {
    onCodeChange?.(codeInput)
  }, [codeInput, onCodeChange])

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed)
  }

  const handleExecuteCode = async () => {
    setIsLoading(true)
    setError(null)
    console.log("... updating types ...")
    
    // Commit the current code - this will trigger the useEffect to notify parent
    setCodeInput(currentCode)
    
    try {
      const response = await fetch('http://localhost:8000/execute-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: currentCode }),
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        if (data.card_types && onUpdateTypes) {
          onUpdateTypes({
            colors: data.card_types.colors,
            layouts: data.card_types.layouts
          })
        }
        setError(null)
      } else {
        setError(data.error || 'Unknown error occurred')
      }
    } catch (err) {
      setError(`Failed to execute code: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Box
      style={{
        position: 'fixed',
        right: 0,
        top: HEADER_HEIGHT,
        height: `calc(100vh - ${HEADER_HEIGHT})`,
        width: isCollapsed ? '50px' : '400px',
        zIndex: 1000,
        transition: 'width 0.3s ease',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <Paper
        shadow="md"
        p={isCollapsed ? "xs" : "md"}
        style={{
          height: '100%',
          borderRadius: '0',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Toggle button */}
        <ActionIcon
          variant="light"
          onClick={toggleCollapse}
          style={{
            alignSelf: isCollapsed ? 'center' : 'flex-end',
            marginBottom: isCollapsed ? 0 : 'md'
          }}
        >
          {isCollapsed ? <IconChevronLeft size={16} /> : <IconChevronRight size={16} />}
        </ActionIcon>

        {!isCollapsed && (
          <div style={{overflow: 'scroll'}}>
            {/* Title */}
            <Title order={3} mb="md">
              Card Types
            </Title>

            {/* Update Types Button */}
            <Button
              variant="filled"
              mb="md"
              onClick={handleExecuteCode}
              loading={isLoading}
              disabled={isLoading}
            >
              {isLoading ? 'Executing...' : 'Update Types (Ctrl+Enter)'}
            </Button>

            {/* Error Display */}
            {error && (
              <Alert 
                icon={<IconAlertCircle size={16} />} 
                title="Execution Error" 
                color="red"
                mb="md"
                style={{ fontSize: '12px' }}
              >
                {error}
              </Alert>
            )}

            {/* Code Input with Syntax Highlighting */}
            <Box style={{ flex: 1, overflow: 'visible'}}>
              <CodeEditor
                value={currentCode}
                language="python"
                placeholder="Python code for the card type definition ..."
                onChange={(evn) => setCurrentCode(evn.target.value)}
                onKeyDown={(evn) => {
                  if (evn.key === 'Enter' && (evn.ctrlKey || evn.metaKey)) {
                    evn.preventDefault()
                    handleExecuteCode()
                  }
                }}
                rehypePlugins={[
                  [rehypePrismPlus, { showLineNumbers: true }]
                ]}
                padding={15}
                style={{
                  backgroundColor: "#fafafa",
                  fontFamily: 'ui-monospace,SFMono-Regular,SF Mono,Consolas,Liberation Mono,Menlo,monospace',
                  height: '100%',
                  borderRadius: '4px',
                  border: '1px solid #ced4da',
                }}
              />
            </Box>
          </div>
        )}
      </Paper>
    </Box>
  )
}