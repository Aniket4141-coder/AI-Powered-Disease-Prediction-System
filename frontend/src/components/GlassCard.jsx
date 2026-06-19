import { FiMessageCircle } from 'react-icons/fi'

const GlassCard = ({ title, subtitle, children, className = '' }) => {
  const isChatbotCard = title === 'Chatbot'

  return (
    <div className={`glass-card ${className}`}>
      {(title || subtitle) && (
        <div className={`card-header ${isChatbotCard ? 'card-header-chatbot' : ''}`}>
          {isChatbotCard ? (
            <div className="card-header-chatbotShell">
              <span className="card-header-accent" aria-hidden="true" />
              <div className="card-header-copy card-header-chatbotCopy">
                <span className="card-header-kicker">AI HEALTH SYSTEM</span>
                <div className="card-header-titleRow card-header-chatbotTitleRow">
                  <span className="card-header-icon card-header-iconChatbot" aria-hidden="true">
                    {'\u{1F9E0}'}
                  </span>
                  <div className="card-header-titleGroup">
                    <div className="card-header-titleAndBadge">
                      <h4>{title}</h4>
                      <span className="card-header-badge card-header-liveBadge">
                        <span className="card-header-badgeDot" aria-hidden="true" />
                        Live AI
                      </span>
                    </div>
                    {subtitle && <p>{subtitle}</p>}
                  </div>
                </div>
              </div>
              <button type="button" className="card-header-action" aria-label="Open chat tools">
                <FiMessageCircle />
              </button>
            </div>
          ) : (
            <div className="card-header-copy">
              {title && <h4>{title}</h4>}
              {subtitle && <p>{subtitle}</p>}
            </div>
          )}
        </div>
      )}
      {children}
    </div>
  )
}

export default GlassCard
