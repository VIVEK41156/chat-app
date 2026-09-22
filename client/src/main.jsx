import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('WhatsApp App Crash caught by ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#111b21] text-[#e9edef] p-6 text-center select-none">
          <div className="w-16 h-16 rounded-full bg-[#202c33] flex items-center justify-center mb-4 text-[#00a884] shadow-lg border border-[#2a3942]">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
          </div>
          <h1 className="text-xl font-bold mb-2">WhatsApp Web</h1>
          <p className="text-sm text-[#8696a0] max-w-sm mb-6">
            Something unexpected occurred. Tap below to reload the app with the latest updates.
          </p>
          <button
            onClick={() => {
              try { localStorage.removeItem('whatsapp_active_user_id'); } catch (e) {}
              window.location.reload();
            }}
            className="px-6 py-2.5 bg-[#00a884] hover:bg-[#008f6f] text-white font-semibold rounded-xl shadow-lg transition"
          >
            Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

