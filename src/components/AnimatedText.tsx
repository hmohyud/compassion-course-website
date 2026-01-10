import React, { useState, useEffect, useRef } from 'react';

const AnimatedText: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeElement, setActiveElement] = useState<'text1' | 'text2'>('text1');
  const [text1Class, setText1Class] = useState('animated-text-content slide-right-in');
  const [text2Class, setText2Class] = useState('animated-text-content');
  const [text1Content, setText1Content] = useState('Build lasting empathy practices');
  const [text2Content, setText2Content] = useState('');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const initialTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const overlapTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const activeElementRef = useRef<'text1' | 'text2'>('text1');

  const messages = [
    'Build lasting empathy practices',
    'Be heard and understood',
    'Create meaningful dialogue',
    'Live in alignment with your values',
    'Join a global compassion community'
  ];

  const exitAnimations = [
    'slide-left-out',
    'slide-right-out',
    'dissolve-out',
    'fly-up-out',
    'zoom-out',
    'spiral-out',
    'bounce-out'
  ];

  const enterAnimations = [
    'slide-left-in',
    'slide-right-in',
    'slide-top-in',
    'slide-bottom-in',
    'slide-diagonal-in',
    'fade-scale-in'
  ];

  useEffect(() => {
    // Start the animation cycle after initial delay (3 seconds)
    initialTimeoutRef.current = setTimeout(() => {
      const slideToNext = () => {
        setCurrentIndex((prevIndex) => {
          const nextIndex = (prevIndex + 1) % messages.length;
          const exitClass = exitAnimations[prevIndex % exitAnimations.length];
          const enterClass = enterAnimations[nextIndex % enterAnimations.length];
          const currentActive = activeElementRef.current;

          // Start exit animation on active element
          if (currentActive === 'text1') {
            setText1Class(`animated-text-content ${exitClass}`);
          } else {
            setText2Class(`animated-text-content ${exitClass}`);
          }

          // Start enter animation on inactive element after overlap delay (500ms)
          if (overlapTimeoutRef.current) {
            clearTimeout(overlapTimeoutRef.current);
          }
          
          overlapTimeoutRef.current = setTimeout(() => {
            if (currentActive === 'text1') {
              setText2Content(messages[nextIndex]);
              setText2Class(`animated-text-content ${enterClass}`);
              activeElementRef.current = 'text2';
              setActiveElement('text2');
            } else {
              setText1Content(messages[nextIndex]);
              setText1Class(`animated-text-content ${enterClass}`);
              activeElementRef.current = 'text1';
              setActiveElement('text1');
            }
          }, 500);

          return nextIndex;
        });
      };

      // Start the interval (4 seconds total cycle)
      intervalRef.current = setInterval(slideToNext, 4000);
    }, 3000);

    // Cleanup
    return () => {
      if (initialTimeoutRef.current) {
        clearTimeout(initialTimeoutRef.current);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (overlapTimeoutRef.current) {
        clearTimeout(overlapTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="animated-text">
      <div 
        id="animatedText1"
        className={text1Class}
      >
        {text1Content}
      </div>
      <div 
        id="animatedText2"
        className={text2Class}
        style={{ opacity: text2Content ? 1 : 0 }}
      >
        {text2Content}
      </div>
    </div>
  );
};

export default AnimatedText;
