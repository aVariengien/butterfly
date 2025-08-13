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
# Use "user_only: bool = True" or "generation_only: bool = True" to restrict the card usage

class Idea(Card):
    """Unconstrained idea"""
    title: Optional[str] = Field(None, description="A short title defining the card")
    body: Optional[str] = Field(None, description="The body of the idea, unconstrained.")
    user_only: bool = True
    
class Context(Card):
    """A raw copy paste of a ressource that is useful to add in context."""
    title: Optional[str] = Field(None, description="The title of the ressource")
    body: Optional[str] = Field(None, description="The raw copy paste of the ressource.")
    user_only: bool = True

class Example(Card):
    """A concrete example."""
    title: Optional[str] = Field(None, description="A short title defining the card")
    body: Optional[str] = Field(None, description="The body of the example, in 1-2 sentences.")
    details: Optional[str] = Field("", description="Additional details when more space is needed.")


class Image(Card):
    """A visual illustration to concretize."""
    title: None
    body: None
    img_prompt: str = Field(..., description="The prompt for AI image generation. The prompt should be creative, and not instruct the creation of any diagram or any image containing text elements.")

class Question(Card):
    """A card representing a question."""
    title: Optional[str] = Field(None, description="The question.")
    body: None

class Claim(Card):
    """A card representing a claim."""
    title: Optional[str] = Field(None, description="A precise worded sentence making a claim. The claim should not be a tautology and should 'try to stick its head out'.'")
    body: Optional[str] = Field(None, description="Space for short expansion on the claim, potentially relating to other cards.")

class Property(Card):
    """A card representing a property that can vary in degree. A property need to be able to have more of X or less of X, or an example need to be more of X or less of X. To check if it's a property, you need to find an example where the natural sentence 'Example E is/has more X than example B' makes sense."""
    title: Optional[str] = Field(None, description="Short name for the property")
    body: Optional[str] = Field(None, description="Short description.")
    low_example: Optional[str] = Field(None, description="The title of a card in the whiteboard that has low amount of the property")
    high_example: Optional[str] = Field(None, description="he title of a card in the whiteboard that has high amount of the property")


class ContrastingExamplePair(Card):
    """A pair of contrasting examples for a claim."""
    claim_title: str = Field(..., description="The title of a claim card from the whiteboard the pair is reacting to.")
    affirming_example: Example = Field(..., description="An example that is illustrating the claim")
    counter_example: Example = Field(..., description="A counter example, disproving the claim")
    generation_only: bool = True

class FocusingCard(Card):
    """A card for providing focus comments. Give a general comment when my activity is getting out of the theme OR getting out of the intention set for the session."""
    title: str = Field(..., description="General comment about activity focus")
    generation_only: bool = True
    

class ExampleSpace(Card):
    """A 2D space of examples organized by two properties. Generate 4 examples that cover all the quadrant of low/high property1 and low/high property2."""
    generation_only: bool = True
    title_property1: str = Field(..., description="The title of an existing property card from the board that define the first axis of the space.")
    user_only: bool = True
    title_property2: str = Field(..., description="The title of an existing property card from the board that define the second axis of the space.")
    examples: list[Example] = Field(..., description="List of 4 examples cards covering the property space. In the examples description include the high X, low Y at the start. ")
`)
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