import Chatbot from '../components/Chatbot'
import GlassCard from '../components/GlassCard'

const ChatPage = () => (
  <div className="page-grid">
    <section className="grid-span">
      <div className="hero hero-secondary chat-hero">
        <div className="hero-content">
          <p>🧠 AI Health Assistant</p>
          <h2>Smart guidance for symptoms, wellness, and care.</h2>
          <span>Ask anything about symptoms, wellness, and care.</span>
        </div>
      </div>
    </section>

    <GlassCard title="Chatbot" subtitle="Safe, structured health guidance" className="grid-span chat-card">
      <Chatbot />
    </GlassCard>
  </div>
)

export default ChatPage
