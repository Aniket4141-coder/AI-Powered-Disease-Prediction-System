import { useEffect, useMemo, useRef, useState } from 'react'
import { FiSearch, FiSend } from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'

const suggestionChips = [
  'I have fever and headache',
  'What are symptoms of diabetes?',
  'How to improve immunity?'
]

const getInitials = (value) => {
  const safe = (value || '').trim()
  if (!safe) return 'U'
  const parts = safe.split(' ').filter(Boolean)
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

const formatTime = (date) =>
  new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

const buildFallbackReply = () => [
  'Explanation: Based on your question, this may be related to general health or wellness.',
  '',
  'Causes: It may involve lifestyle factors, stress, hydration, sleep, or an underlying condition.',
  '',
  'Advice: Maintain a balanced diet, stay hydrated, and provide more details like symptoms and duration.',
  '',
  'Warning: If symptoms are severe, worsening, or sudden, seek urgent medical care.'
].join('\n')

const Chatbot = () => {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef(null)

  const userInitials = useMemo(
    () => getInitials(user?.name || user?.full_name || user?.email),
    [user?.email, user?.full_name, user?.name]
  )

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = async () => {
    const trimmed = input.trim()
    if (!trimmed || loading) return

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: Date.now()
    }

    const typingId = `typing-${Date.now()}`
    setMessages((prev) => [
      ...prev,
      userMessage,
      {
        id: typingId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        isTyping: true
      }
    ])
    setInput('')
    setLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(user?.token ? { Authorization: `Bearer ${user.token}` } : {})
        },
        body: JSON.stringify({
          message: trimmed,
          user_id: user?.id
        })
      })

      const payload = await response.json().catch(() => ({}))
      await new Promise((resolve) => setTimeout(resolve, 1200))

      const replyText = !response.ok || payload?.error
        ? buildFallbackReply()
        : payload?.reply || buildFallbackReply()

      setMessages((prev) =>
        prev
          .filter((msg) => msg.id !== typingId)
          .concat({
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: replyText,
            timestamp: Date.now()
          })
      )
    } catch (err) {
      await new Promise((resolve) => setTimeout(resolve, 1200))
      setMessages((prev) => [
        ...prev.filter((msg) => msg.id !== typingId),
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: buildFallbackReply(),
          timestamp: Date.now(),
          isError: true
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="chatbot">
      <div className="chatbot-header">
        <div className="chatbot-header-copy">
          <div className="chatbot-header-titleRow">
            <span className="chatbot-header-icon" aria-hidden="true">🧠</span>
            <h3>AI Health Assistant</h3>
          </div>
          <p>Smart guidance for symptoms, wellness, and care</p>
        </div>
        <button type="button" className="chatbot-header-action" aria-label="Search">
          <FiSearch />
        </button>
      </div>

      <div className="chatbot-messages">
        {messages.length === 0 && (
          <div className="chatbot-empty">
            <div className="chatbot-empty-bubble">
              Hi! I&apos;m your AI health assistant. Ask me anything.
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`chatbot-message ${msg.role} ${msg.isError ? 'error' : ''}`}>
            <div className="chatbot-avatar">
              {msg.role === 'assistant' ? '🤖' : userInitials}
            </div>
            <div className="chatbot-bubble">
              {msg.isTyping ? (
                <div className="typing-indicator" aria-label="Assistant is typing">
                  <span className="typing-avatar">🤖</span>
                  <span className="typing-dots" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </span>
                </div>
              ) : (
                <>
                  <div className="chatbot-text">{msg.content}</div>
                  {msg.timestamp && <span className="chatbot-time">{formatTime(msg.timestamp)}</span>}
                </>
              )}
            </div>
          </div>
        ))}

        <div ref={scrollRef} />
      </div>

      <div className="chatbot-suggestions">
        {suggestionChips.map((chip) => (
          <button
            key={chip}
            type="button"
            className="chatbot-chip"
            onClick={() => setInput(chip)}
            disabled={loading}
          >
            <span>{chip}</span>
          </button>
        ))}
      </div>

      <div className="chatbot-input">
        <textarea
          rows="2"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your health question..."
          disabled={loading}
        />
        <button
          className="primary-button chatbot-send"
          type="button"
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          aria-label="Send message"
        >
          <FiSend />
          <span>{loading ? 'Sending...' : 'Send'}</span>
        </button>
      </div>
    </div>
  )
}

export default Chatbot
