import React from 'react'
import ReactDOM from 'react-dom/client'

function SimpleApp() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>TurnFix - React is Working!</h1>
      <p>If you can see this, React is loading properly.</p>
      <p>Current time: {new Date().toLocaleString()}</p>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SimpleApp />
  </React.StrictMode>,
)
