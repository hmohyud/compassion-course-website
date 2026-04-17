import { useEffect, useRef, useState } from 'react';

const SCRIPT_URL = 'https://unpkg.com/@elevenlabs/convai-widget-embed';
const AGENT_ID = 'agent_0301kaf26r60eqkr3x8qe2v8wdq0';

// Lazy chatbot: shows a lightweight trigger button by default and only loads
// the ElevenLabs ConvAI widget (which allocates multiple WebMediaPlayer slots
// for voice streaming) after the user clicks to open it. This keeps Chrome's
// WebMediaPlayer budget free for in-page audio (sample weeks, videos, etc.)
// on the initial page load.
const ChatbotWidget: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activated, setActivated] = useState(false);

  useEffect(() => {
    if (!activated) return;

    const existingScript = document.querySelector(`script[src="${SCRIPT_URL}"]`);
    if (existingScript || !containerRef.current) return;

    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    script.type = 'text/javascript';
    script.onload = () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
        const el = document.createElement('elevenlabs-convai');
        el.setAttribute('agent-id', AGENT_ID);
        containerRef.current.appendChild(el);
      }
    };
    document.head.appendChild(script);

    return () => {
      const s = document.querySelector(`script[src="${SCRIPT_URL}"]`);
      if (s) s.remove();
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
  }, [activated]);

  if (!activated) {
    return (
      <button
        type="button"
        className="chatbot-widget-trigger"
        onClick={() => setActivated(true)}
        aria-label="Open course assistant chat"
        title="Ask the course assistant"
      >
        <i className="fas fa-comments" aria-hidden="true"></i>
        <span>Ask about the course</span>
      </button>
    );
  }

  return <div ref={containerRef} className="chatbot-widget" />;
};

export default ChatbotWidget;
