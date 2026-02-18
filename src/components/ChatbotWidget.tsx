import { useEffect, useRef } from 'react';

const SCRIPT_URL = 'https://unpkg.com/@elevenlabs/convai-widget-embed';
const AGENT_ID = 'agent_0301kaf26r60eqkr3x8qe2v8wdq0';

const ChatbotWidget: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
  }, []);

  return <div ref={containerRef} className="chatbot-widget" />;
};

export default ChatbotWidget;
