import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  FiAlertTriangle,
  FiBarChart2,
  FiDownload,
  FiHome,
  FiZap
} from 'react-icons/fi'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts'
import jsPDF from 'jspdf'
import GlassCard from '../components/GlassCard'
import RiskBadge from '../components/RiskBadge'
import { formatTitleCase, getRiskLevel } from '../lib/formatters'

const normalizeApiResult = (payload, symptomsFallback) => {
  if (!payload || typeof payload !== 'object') return {}
  if (payload.results) return payload

  if (payload.predictions || payload.predicted) {
    const results = payload.predictions || payload.predicted
    return {
      results: Array.isArray(results) ? results : [],
      symptoms: payload.symptoms || symptomsFallback,
      info: payload.info || {},
      risk_level: payload.risk_level,
      top_predictions: payload.top_predictions
    }
  }

  return {
    results: payload.results || [],
    symptoms: payload.symptoms || symptomsFallback,
    info: payload.info || {},
    risk_level: payload.risk_level,
    top_predictions: payload.top_predictions
  }
}

const ResultPage = ({ data }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [serverState, setServerState] = useState(null)

  const apiState = useMemo(() => {
    const fromState = location.state?.resultData || location.state
    if (fromState) {
      return normalizeApiResult(fromState, location.state?.symptoms)
    }
    return null
  }, [location.state])

  useEffect(() => {
    if (apiState) {
      const errorMessage = apiState?.error || data?.error || ''
      setError(errorMessage)
      setLoading(false)
    }
  }, [apiState, data])

  useEffect(() => {
    if (apiState) return
    let mounted = true
    setLoading(true)
    setError('')
    fetch('/api/history')
      .then((res) => res.json())
      .then((payload) => {
        if (!mounted) return
        if (payload?.error) {
          setError(payload.error)
          setServerState(null)
          return
        }
        const latest = Array.isArray(payload?.history) ? payload.history[0] : null
        if (!latest) {
          setServerState(null)
          return
        }
        setServerState({
          top_predictions: latest.top_predictions || [[latest.prediction, latest.confidence]],
          symptoms: latest.symptoms || [],
          risk_level: latest.risk_level
        })
      })
      .catch((err) => {
        if (!mounted) return
        console.error('Result history fetch error', err)
        setError('Unable to load prediction data.')
        setServerState(null)
      })
      .finally(() => {
        if (!mounted) return
        setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [apiState])

  const resolvedState = apiState || serverState
  const symptoms = resolvedState?.symptoms || data.symptoms || []
  const info = resolvedState?.info || data.info || {}
  const rawResults = resolvedState?.top_predictions || resolvedState?.top_results || data.top_results || resolvedState?.results || data.results || []

  const topPredictions = useMemo(() => {
    const mapped = (rawResults || []).map((item) => {
      if (Array.isArray(item)) {
        return { disease: item[0], confidence: Number(item[1]) || 0 }
      }
      if (item && typeof item === 'object') {
        return {
          disease: item.disease || item.prediction || item.name || 'Unknown',
          confidence: Number(item.confidence) || 0
        }
      }
      return { disease: 'Unknown', confidence: 0 }
    })

    return [...mapped]
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3)
  }, [rawResults])

  const hasResults = topPredictions.length > 0
  const hasConfidence = topPredictions.some((item) => Number(item.confidence) > 0)

  const topResult = topPredictions[0]
  const riskFromApi = resolvedState?.risk_level
  const derivedRisk = getRiskLevel(Number(topResult?.confidence) || 0)
  const riskLabelRaw = riskFromApi || derivedRisk.label
  const riskLabel = riskLabelRaw
    ? riskLabelRaw.toString().charAt(0).toUpperCase() + riskLabelRaw.toString().slice(1).toLowerCase()
    : 'Low'
  const riskTone = riskFromApi
    ? riskFromApi.toLowerCase() === 'high'
      ? 'danger'
      : riskFromApi.toLowerCase() === 'medium'
        ? 'warning'
        : 'success'
    : derivedRisk.tone

  const advice = riskLabel === 'High'
    ? 'Consult a doctor immediately.'
    : riskLabel === 'Medium'
      ? 'Monitor symptoms and consult if needed.'
      : 'Maintain a healthy lifestyle and monitor changes.'

  const confidenceInterpretation = riskLabel === 'High'
    ? 'Strong likelihood'
    : riskLabel === 'Medium'
      ? 'Moderate likelihood'
      : 'Weak indication'

  const nextSteps = [
    riskLabel === 'High'
      ? 'Visit a doctor promptly'
      : riskLabel === 'Medium'
        ? 'Monitor symptoms closely'
        : 'Maintain healthy habits',
    'Track any new or changing symptoms',
    'Follow lifestyle advice and seek care if symptoms worsen'
  ]

  const reportMeta = useMemo(() => {
    const base = [
      topResult?.disease || 'unknown',
      Number(topResult?.confidence || 0).toFixed(2),
      ...(symptoms || [])
    ].join('|')

    let hash = 0
    for (let index = 0; index < base.length; index += 1) {
      hash = ((hash << 5) - hash) + base.charCodeAt(index)
      hash |= 0
    }

    const reportSuffix = Math.abs(hash).toString(36).slice(0, 8).toUpperCase()
    const generatedOnDate = new Date()

    return {
      reportId: `MP-${reportSuffix || 'REPORT'}`,
      generatedOn: generatedOnDate,
      generatedOnLabel: generatedOnDate.toLocaleString([], {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  }, [symptoms, topResult?.confidence, topResult?.disease])

  const chartData = topPredictions.map((item) => ({
    name: item.disease,
    value: Number(item.confidence) || 0
  }))

  const diseaseDetails = {
    description: info.description || '',
    causes: info.causes || info.cause || '',
    symptoms: Array.isArray(info.symptoms) ? info.symptoms : (info.symptoms ? [info.symptoms] : []),
    prevention: Array.isArray(info.prevention)
      ? info.prevention
      : Array.isArray(info.precautions)
        ? info.precautions
        : info.prevention
          ? [info.prevention]
          : (info.precautions ? [info.precautions] : []),
    treatment: info.treatment || ''
  }

  const hasDetails = Boolean(
    diseaseDetails.description ||
    diseaseDetails.causes ||
    diseaseDetails.symptoms.length ||
    diseaseDetails.prevention.length ||
    diseaseDetails.treatment
  )

  const downloadPDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4')
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 16
    const contentWidth = pageWidth - margin * 2
    let y = 18

    const ensureSpace = (needed = 10) => {
      if (y + needed <= pageHeight - 18) return
      doc.addPage()
      y = 18
    }

    const addText = (text, x, size = 10, options = {}) => {
      doc.setFont('helvetica', options.style || 'normal')
      doc.setFontSize(size)
      return doc.text(text, x, y, options)
    }

    const addSectionTitle = (title) => {
      ensureSpace(14)
      doc.setFillColor(245, 248, 255)
      doc.setDrawColor(219, 234, 254)
      doc.roundedRect(margin, y - 4, contentWidth, 10, 2, 2, 'FD')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(29, 78, 216)
      doc.text(title, margin + 4, y + 3)
      y += 14
      doc.setTextColor(31, 41, 55)
    }

    const addParagraph = (text, indent = 0, size = 10, lineGap = 5) => {
      const lines = doc.splitTextToSize(String(text || ''), contentWidth - indent)
      lines.forEach((line) => {
        ensureSpace(lineGap)
        addText(line, margin + indent, size)
        y += lineGap
      })
      y += 1
    }

    const addBulletList = (items) => {
      const list = Array.isArray(items) && items.length ? items : ['No symptoms recorded']
      list.forEach((item) => {
        const lines = doc.splitTextToSize(`- ${item}`, contentWidth - 6)
        lines.forEach((line, index) => {
          ensureSpace(6)
          addText(line, margin + 2, 10)
          y += 6
        })
      })
      y += 1
    }

    const addKeyValue = (label, value, labelWidth = 38) => {
      ensureSpace(8)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(75, 85, 99)
      doc.text(label, margin, y)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(31, 41, 55)
      const valueLines = doc.splitTextToSize(String(value || 'Not available'), contentWidth - labelWidth)
      doc.text(valueLines, margin + labelWidth, y)
      y += Math.max(6, valueLines.length * 5)
      y += 1
    }

    const userData = (() => {
      try {
        const raw = localStorage.getItem('user')
        return raw ? JSON.parse(raw) : {}
      } catch {
        return {}
      }
    })()

    const userName = userData?.name || userData?.full_name || 'Care Member'
    const confidenceValue = Number(topResult?.confidence || 0)
    const topThree = topPredictions.slice(0, 3)
    const diseaseName = topResult?.disease || 'Unknown'
    const riskHeader = `${riskLabel} Risk`
    const diseaseDetailsReport = {
      description: diseaseDetails.description || 'Not available.',
      causes: diseaseDetails.causes || 'Not available.',
      treatment: diseaseDetails.treatment || 'Not available.'
    }

    // Header block
    doc.setFillColor(248, 251, 255)
    doc.setDrawColor(229, 231, 235)
    doc.roundedRect(margin, y - 4, contentWidth, 34, 4, 4, 'FD')
    doc.setFillColor(37, 99, 235)
    doc.roundedRect(margin, y - 4, 4, 34, 2, 2, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.setTextColor(17, 24, 39)
    doc.text('MediPredict AI', margin + 10, y + 6)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    doc.setTextColor(75, 85, 99)
    doc.text('AI Disease Prediction Report', margin + 10, y + 13)
    doc.setFontSize(9)
    doc.text(`User: ${userName}`, margin + 10, y + 20)
    doc.text(`Date: ${reportMeta.generatedOnLabel}`, margin + 95, y + 20)
    doc.text(`Report ID: ${reportMeta.reportId}`, margin + 10, y + 26)
    y += 42

    // Primary result
    addSectionTitle('Primary Result')
    doc.setFillColor(239, 246, 255)
    doc.setDrawColor(191, 219, 254)
    doc.roundedRect(margin, y, contentWidth, 28, 4, 4, 'FD')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(17, 24, 39)
    doc.text(`Disease: ${diseaseName}`, margin + 4, y + 9)
    doc.text(`Confidence: ${confidenceValue > 0 ? `${confidenceValue.toFixed(2)}%` : 'Not available'}`, margin + 4, y + 17)
    doc.text(`Risk Level: ${riskHeader}`, margin + 105, y + 9)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(75, 85, 99)
    doc.text(`Confidence interpretation: ${confidenceInterpretation}`, margin + 105, y + 17)
    y += 34

    // Top 3 predictions
    addSectionTitle('Top 3 Predictions')
    topThree.forEach((item, index) => {
      ensureSpace(10)
      const rowY = y
    doc.setFillColor(255, 255, 255)
      doc.setDrawColor(229, 231, 235)
      doc.roundedRect(margin, rowY - 3, contentWidth, 10, 2, 2, 'FD')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.text(`${index + 1}. ${item.disease || 'Unknown'}`, margin + 4, rowY + 3)
      doc.setFont('helvetica', 'normal')
      const rowConfidence = Number(item.confidence)
      doc.text(
        `${Number.isFinite(rowConfidence) ? `${rowConfidence.toFixed(2)}%` : 'Not available'}`,
        pageWidth - margin - 44,
        rowY + 3
      )
      const rowRisk = getRiskLevel(rowConfidence)
      doc.text(rowRisk.label, pageWidth - margin - 18, rowY + 3)
      y += 11
    })
    if (!topThree.length) {
      addParagraph('No prediction results available.', 0, 10, 6)
    }

    // Symptoms
    addSectionTitle('Symptoms')
    addBulletList((symptoms || []).map((symptom) => formatTitleCase(symptom)))

    // Disease details
    addSectionTitle('Disease Details')
    addKeyValue('Description', diseaseDetailsReport.description)
    addKeyValue('Causes', diseaseDetailsReport.causes)
    ensureSpace(8)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(75, 85, 99)
    doc.text('Symptoms', margin, y)
    y += 6
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(31, 41, 55)
    addBulletList(diseaseDetails.symptoms.length ? diseaseDetails.symptoms.map((item) => formatTitleCase(item)) : ['No symptom data available'])
    ensureSpace(6)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(75, 85, 99)
    doc.text('Prevention', margin, y)
    y += 6
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(31, 41, 55)
    addBulletList(diseaseDetails.prevention.length ? diseaseDetails.prevention.map((item) => formatTitleCase(item)) : ['No prevention data available'])
    addKeyValue('Treatment', diseaseDetailsReport.treatment)

    // Health advice
    addSectionTitle('Health Advice')
    addParagraph(advice, 0, 10, 6)

    // Next steps
    addSectionTitle('Next Steps')
    addBulletList(nextSteps)

    // Disclaimer
    addSectionTitle('Disclaimer')
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(10)
    doc.setTextColor(153, 27, 27)
    addParagraph('This report is AI-generated and not a medical diagnosis.', 0, 10, 6)

    // Footer
    ensureSpace(10)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(107, 114, 128)
    doc.text(`Report ID: ${reportMeta.reportId}`, margin, pageHeight - 14)
    doc.text('Generated for informational purposes only.', margin, pageHeight - 8)

    doc.save('prediction-report.pdf')
  }

  if (loading) {
    return (
      <div className="page-grid">
        <GlassCard title="Loading Report" subtitle="Fetching your prediction report" className="grid-span">
          <div className="symptom-loading">Preparing your medical report...</div>
        </GlassCard>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page-grid">
        <GlassCard title="Unable to Load" subtitle="Something went wrong" className="grid-span">
          <p>{error}</p>
          <button className="ghost-button" type="button" onClick={() => navigate('/predict')}>
            Go to Predict
          </button>
        </GlassCard>
      </div>
    )
  }

  if (!hasResults) {
    return (
      <div className="page-grid">
        <GlassCard title="No Results" subtitle="Run a prediction to view insights" className="grid-span">
          <div className="empty-state">
            <h4>No prediction data available</h4>
            <p>Return to the prediction page to generate a new assessment.</p>
            <button className="primary-button" type="button" onClick={() => navigate('/predict')}>
              Go to Predict
            </button>
          </div>
        </GlassCard>
      </div>
    )
  }

  const TopResult = () => (
    <section className="grid-span">
      <div className="hero hero-result">
        <div className="hero-content">
          <p>Prediction Report</p>
          <h2>Top Predicted Disease: {topResult.disease}</h2>
          <span>Confidence calibrated from your selected symptoms.</span>
          <div className="report-meta-strip">
            <span><strong>Report ID:</strong> {reportMeta.reportId}</span>
            <span><strong>Generated On:</strong> {reportMeta.generatedOnLabel}</span>
            <span><strong>Confidence Interpretation:</strong> {confidenceInterpretation}</span>
          </div>
          <div className="hero-metrics">
            <div>
              <h4>Confidence</h4>
              <strong>
                {Number(topResult.confidence) > 0
                  ? `${Number(topResult.confidence).toFixed(2)}%`
                  : 'Confidence not available'}
              </strong>
            </div>
            <div>
              <h4>Risk Level</h4>
              <strong>{riskLabel}</strong>
            </div>
            <div>
              <h4>Recommendation</h4>
              <strong>{advice}</strong>
            </div>
          </div>
          <div className="hero-notes">
            <div>
              <h4>Risk Label</h4>
              <strong><RiskBadge tone={riskTone} label={`${riskLabel} Risk`} /></strong>
            </div>
            <div>
              <h4>Next Steps</h4>
              <strong>{nextSteps[0]}</strong>
            </div>
          </div>
        </div>
        <div className="hero-actions">
          <RiskBadge tone={riskTone} label={`${riskLabel} Risk`} />
          <button className="ghost-button" type="button" onClick={downloadPDF}>
            <FiDownload /> Download Report
          </button>
        </div>
      </div>
    </section>
  )

  const TopPredictions = () => (
    <GlassCard title="Top 3 Predictions" subtitle="Highest confidence results" className="grid-span">
      <div className="result-list">
        {topPredictions.map((item) => {
          const itemRisk = getRiskLevel(Number(item.confidence) || 0)
          const confidenceValue = Number(item.confidence)
          return (
            <div key={item.disease} className="result-item">
              <div>
                <h4>{item.disease}</h4>
                <p>
                  {confidenceValue > 0
                    ? `Confidence ${confidenceValue.toFixed(2)}%`
                    : 'Confidence not available'}
                </p>
              </div>
              <div className="result-item-meta">
                <span>{itemRisk.label} Risk</span>
                <RiskBadge tone={itemRisk.tone} label={itemRisk.label} />
              </div>
            </div>
          )
        })}
      </div>
    </GlassCard>
  )

  const ChartsSection = () => (
    <>
      <GlassCard title="Probability Distribution" subtitle="Top 3 disease share" className="grid-span">
        {!hasConfidence ? (
          <div className="empty-state">
            <h4>Confidence not available</h4>
            <p>We could not compute normalized confidence values.</p>
          </div>
        ) : (
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Legend verticalAlign="bottom" height={32} />
                <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid rgba(15,23,42,0.1)', color: '#0f172a' }} />
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={95}
                  paddingAngle={3}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${entry.name}-${index}`}
                      fill={['#22c55e', '#f59e0b', '#ef4444'][index % 3]}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </GlassCard>

      <GlassCard title="Confidence Comparison" subtitle="Disease vs confidence" className="grid-span">
        {!hasConfidence ? (
          <div className="empty-state">
            <h4>Confidence not available</h4>
            <p>We could not compute normalized confidence values.</p>
          </div>
        ) : (
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(15, 23, 42, 0.08)" />
                <XAxis dataKey="name" stroke="rgba(15, 23, 42, 0.6)" />
                <YAxis stroke="rgba(15, 23, 42, 0.6)" />
                <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid rgba(15,23,42,0.1)', color: '#0f172a' }} />
                <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`bar-${entry.name}-${index}`}
                      fill={['#22c55e', '#f59e0b', '#ef4444'][index % 3]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </GlassCard>
    </>
  )

  const DiseaseDetails = () => (
    <GlassCard title="Disease Details" subtitle="Top disease information" className="grid-span">
      {!hasDetails ? (
        <div className="empty-state">
          <h4>No additional details available</h4>
          <p>We could not find medical details for this condition.</p>
        </div>
      ) : (
        <div className="insight-grid">
          <div>
            <h4>Description</h4>
            <p>{diseaseDetails.description || 'No description available.'}</p>
            {diseaseDetails.causes && (
              <>
                <h4>Causes</h4>
                <p>{diseaseDetails.causes}</p>
              </>
            )}
            {diseaseDetails.treatment && (
              <>
                <h4>Treatment</h4>
                <p>{diseaseDetails.treatment}</p>
              </>
            )}
          </div>
          <div className="insight-panel">
            <h5>Symptoms</h5>
            <ul>
              {(diseaseDetails.symptoms.length ? diseaseDetails.symptoms : ['No symptom data available.']).map((item) => (
                <li key={item}>{formatTitleCase(item)}</li>
              ))}
            </ul>
            <h5>Prevention</h5>
            <ul>
              {(diseaseDetails.prevention.length ? diseaseDetails.prevention : ['No prevention data available.']).map((item) => (
                <li key={item}>{formatTitleCase(item)}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </GlassCard>
  )

  const SymptomsList = () => (
    <GlassCard title="Selected Symptoms" subtitle="Inputs used for prediction" className="grid-span">
      <div className="insight-tags">
        {symptoms.length
          ? symptoms.map((symptom) => <span key={symptom}>{formatTitleCase(symptom)}</span>)
          : <span>No symptoms recorded</span>}
      </div>
    </GlassCard>
  )

  const AdviceSection = () => (
    <GlassCard title="Health Advice" subtitle="Suggested next steps" className="grid-span">
      <div className="ai-insight-card">
        <div className="ai-insight-icon">
          <FiAlertTriangle />
        </div>
        <div>
          <p className="ai-insight-text">
            {riskLabel === 'High' && 'Consult a doctor immediately for professional evaluation.'}
            {riskLabel === 'Medium' && 'Monitor symptoms closely and consult a doctor if they persist.'}
            {riskLabel === 'Low' && 'Maintain a healthy lifestyle and keep monitoring any changes.'}
          </p>
          <p className="ai-insight-subtext">{advice}</p>
        </div>
      </div>
    </GlassCard>
  )

  const NextStepsSection = () => (
    <GlassCard title="Next Steps" subtitle="Suggested follow-up actions" className="grid-span">
      <div className="insight-panel">
        <ul>
          {nextSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ul>
      </div>
    </GlassCard>
  )

  const ActionButtons = () => (
    <GlassCard title="Next Actions" subtitle="Navigate to related workflows" className="grid-span">
      <div className="quick-actions">
        <button className="primary-button" type="button" onClick={() => navigate('/predict')}>
          <FiZap /> Predict Again
        </button>
        <button className="ghost-button" type="button" onClick={() => navigate('/history')}>
          <FiBarChart2 /> View History
        </button>
        <button className="ghost-button" type="button" onClick={() => navigate('/dashboard')}>
          <FiHome /> Dashboard
        </button>
      </div>
    </GlassCard>
  )

  return (
    <div className="page-grid">
      <TopResult />
      <TopPredictions />
      <ChartsSection />
      <DiseaseDetails />
      <SymptomsList />
      <AdviceSection />
      <NextStepsSection />
      <ActionButtons />
    </div>
  )
}

export default ResultPage
