import { useState, useEffect, useRef } from 'react';
import { App as CapApp } from '@capacitor/app';
import llamaImg from './assets/llama.png';
import shakeMp3 from './assets/shake.mp3';
import './App.css';

function App() {
  const [screen, setScreen] = useState<'start' | 'game' | 'hidden'>('start');
  const [activeDice, setActiveDice] = useState<number>(5);
  const [diceValues, setDiceValues] = useState<number[]>([0, 0, 0, 0, 0]);
  const [isRolled, setIsRolled] = useState<boolean>(false);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [rollingValues, setRollingValues] = useState<number[]>([1, 1, 1, 1, 1]);
  const [rollTrigger, setRollTrigger] = useState<number>(0); 

  const rollAudio = useRef<HTMLAudioElement | null>(null);
  
  // We swapped the fixed interval for a recursive loop timer
  const rollLoopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    rollAudio.current = new Audio(shakeMp3);
    rollAudio.current.load();
    
    return () => {
      if (rollLoopRef.current) clearTimeout(rollLoopRef.current);
      if (fallbackTimeoutRef.current) clearTimeout(fallbackTimeoutRef.current);
      if (rollAudio.current) rollAudio.current.onended = null;
    };
  }, []);

  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>(
    window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'
  );

  useEffect(() => {
    const handleResize = () => {
      setOrientation(window.innerWidth > window.innerHeight ? 'landscape' : 'portrait');
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (orientation === 'landscape' && screen === 'game' && isRolled) {
      setIsRolled(false);
      setDiceValues([0, 0, 0, 0, 0]);
    }
  }, [orientation, screen, isRolled]);

  useEffect(() => {
    const handleBackButton = CapApp.addListener('backButton', () => {
      if (screen === 'start') {
        CapApp.exitApp();
      } else if (screen === 'game') {
        setScreen('start');
      } else if (screen === 'hidden') {
        setScreen('game');
      }
    });

    return () => {
      handleBackButton.then((listener) => listener.remove());
    };
  }, [screen]);

  const startGame = () => {
    setActiveDice(5);
    setDiceValues([0, 0, 0, 0, 0]);
    setIsRolled(false);
    setScreen('game');
  };

  const resetGame = () => {
    setActiveDice(5);
    setDiceValues([0, 0, 0, 0, 0]);
    setIsRolled(false);
  };

  const handleQuit = async () => {
    try {
      await CapApp.exitApp();
    } catch (e) {
      console.log("Native App.exitApp not available. Resetting screen to home.", e);
      setScreen('start');
    }
  };

  const rollDice = () => {
    if (activeDice === 0) {
      if (window.confirm("No dice left! Restart game?")) {
        resetGame();
      }
      return;
    }

    if (rollLoopRef.current) clearTimeout(rollLoopRef.current);
    if (fallbackTimeoutRef.current) clearTimeout(fallbackTimeoutRef.current);

    setIsRolling(true);
    setIsRolled(false);
    setRollTrigger(prev => prev + 1);

    const stopRolling = () => {
      if (rollLoopRef.current) clearTimeout(rollLoopRef.current);
      setDiceValues(() => {
        const finalValues = [0, 0, 0, 0, 0];
        for (let i = 0; i < 5; i++) {
          finalValues[i] = Math.floor(Math.random() * 6) + 1;
        }
        return finalValues;
      });
      setIsRolling(false);
      setIsRolled(true);
    };
    
    if (rollAudio.current) {
      rollAudio.current.currentTime = 0;
      rollAudio.current.onended = stopRolling; 
      
      rollAudio.current.play().catch((e) => {
        console.log("Audio play failed, using fallback timer:", e);
        fallbackTimeoutRef.current = setTimeout(stopRolling, 1000);
      });
    } else {
      fallbackTimeoutRef.current = setTimeout(stopRolling, 1000);
    }

    // --- NEW DYNAMIC LOOP LOGIC ---
    const performRollCycle = () => {
      let currentDelay = 80; // The base chaotic speed

      if (rollAudio.current && !isNaN(rollAudio.current.duration)) {
        const timeLeft = rollAudio.current.duration - rollAudio.current.currentTime;
        const settlePhaseDuration = 0.5; // Start slowing down in the last 500ms

        if (timeLeft < settlePhaseDuration && timeLeft > 0) {
          // Calculate how far into the settle phase we are (0.0 to 1.0)
          const progress = 1 - (timeLeft / settlePhaseDuration);
          // Ramp the delay from 80ms up to 350ms as it hits the table
          currentDelay = 80 + (progress * 270);
        }
      }

      setRollingValues(() => {
        const next = [];
        for (let i = 0; i < 5; i++) {
          next.push(Math.floor(Math.random() * 6) + 1);
        }
        return next;
      });

      // Recursively call the next cycle with the newly calculated delay
      rollLoopRef.current = setTimeout(performRollCycle, currentDelay);
    };

    // Kick off the first cycle
    performRollCycle();
  };

  const loseDie = () => {
    if (activeDice > 0) {
      const nextCount = activeDice - 1;
      setActiveDice(nextCount);
      if (nextCount === 0) {
        setScreen('start');
      }
    }
  };

  const dotPositions: Record<number, string[]> = {
    2: ['tr', 'bl'],
    3: ['tr', 'c', 'bl'],
    4: ['tl', 'tr', 'bl', 'br'],
    5: ['tl', 'tr', 'c', 'bl', 'br'],
    6: ['tl', 'tr', 'ml', 'mr', 'bl', 'br']
  };

  const renderDieCard = (value: number, index: number) => {
    if (index >= activeDice) {
      return (
        <div key={index} className="grid-cell">
          <div className="dice-card-inactive"></div>
        </div>
      );
    }

    const displayValue = isRolling ? rollingValues[index] : value;
    const isShowingValue = isRolling || isRolled;
    
    const shakeDir = index % 2 === 0 ? 'a' : 'b';
    const cardClass = `dice-card${isRolling ? ` shaking shake-diag-${shakeDir} roll-anim-${rollTrigger}` : ''}`;

    // --- DYNAMIC CSS SHAKE DURATION ---
    // We slow down the physical CSS shake simultaneously with the face updates
    let shakeDuration = '0.3s'; // Default CSS animation duration
    if (isRolling && rollAudio.current && !isNaN(rollAudio.current.duration)) {
      const timeLeft = rollAudio.current.duration - rollAudio.current.currentTime;
      const settlePhaseDuration = 0.3;
      
      if (timeLeft < settlePhaseDuration && timeLeft > 0) {
        const progress = 1 - (timeLeft / settlePhaseDuration);
        // Ramp the CSS shake duration from 0.3s to 0.6s (making it look heavy/sluggish)
        shakeDuration = `${0.3 + (progress * 0.3)}s`;
      }
    }
    
    // Inject the calculated animation speed directly into the element
    const cardStyle = isRolling ? { animationDuration: shakeDuration } : {};

    if (!isShowingValue) {
      return (
        <div key={index} className="grid-cell">
          <div className={cardClass} style={cardStyle}></div>
        </div>
      );
    }

    if (displayValue === 1) {
      return (
        <div key={index} className="grid-cell">
          <div className={cardClass} style={cardStyle}>
            <img src={llamaImg} className="llama-img" alt="Llama" />
          </div>
        </div>
      );
    }

    return (
      <div key={index} className="grid-cell">
        <div className={cardClass} style={cardStyle}>
          {dotPositions[displayValue]?.map((pos) => (
            <div key={pos} className={`dot dot-${pos}`}></div>
          ))}
        </div>
      </div>
    );
  };

  const screenOrder: Record<typeof screen, number> = { start: 0, game: 1, hidden: 2 };
  const prevScreenRef = useRef(screen);
  const directionRef = useRef<'forward' | 'back'>('forward');
  
  if (prevScreenRef.current !== screen) {
    directionRef.current =
      screenOrder[screen] > screenOrder[prevScreenRef.current] ? 'forward' : 'back';
    prevScreenRef.current = screen;
  }
  const direction = directionRef.current;

  return (
    <div className="app-container">
      <div className={`screen-wrapper slide-${direction}`} key={screen}>
        {screen === 'start' && (
          <>
            <div className="header-bar">Perudo</div>
            <div className="screen-content start-screen">
              <button className="btn-gradient btn-start" onClick={startGame}>
                Start Game
              </button>
              <button className="btn-gradient btn-quit" onClick={handleQuit}>
                Quit
              </button>
            </div>
          </>
        )}

        {screen === 'game' && (
          <>
            <div className="header-bar">Perudo</div>
            <div className="screen-content game-board-screen">
              <div className="dice-grid">
                {Array.from({ length: 5 }).map((_, i) => renderDieCard(diceValues[i], i))}
                <div className="grid-cell">
                  <button className="btn-gradient btn-lose-die" onClick={loseDie}>
                    Lose a Die
                  </button>
                </div>
              </div>
              <button className="btn-gradient btn-roll" onClick={rollDice}>
                Roll Dice
              </button>
              <button className="btn-gradient btn-hide" onClick={() => setScreen('hidden')}>
                Hide Dice
              </button>
            </div>
          </>
        )}

        {screen === 'hidden' && (
          <>
            <div className="header-bar">Perudo Hidden Dice</div>
            <div className="screen-content hidden-screen">
              <button className="btn-gradient btn-show" onClick={() => setScreen('game')}>
                Show Dice
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;