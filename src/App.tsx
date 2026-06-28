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
  // Added a roll trigger ID to force the CSS shake animation to restart on every click
  const [rollTrigger, setRollTrigger] = useState<number>(0); 

  const rollAudio = useRef<HTMLAudioElement | null>(null);
  const rollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    rollAudio.current = new Audio(shakeMp3);
    rollAudio.current.load();
    
    return () => {
      if (rollIntervalRef.current) clearInterval(rollIntervalRef.current);
      if (rollTimeoutRef.current) clearTimeout(rollTimeoutRef.current);
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

  // NOTE: Commented out for Desktop testing. Uncomment for mobile!
  
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

    // 1. Instantly clear existing timers so the dice don't stop mid-spam
    if (rollIntervalRef.current) clearInterval(rollIntervalRef.current);
    if (rollTimeoutRef.current) clearTimeout(rollTimeoutRef.current);

    setIsRolling(true);
    setIsRolled(false);
    
    // 2. Update trigger to force CSS re-render and restart the shake animation
    setRollTrigger(prev => prev + 1);
    
    // 3. Instantly restart audio from the beginning on every click
    if (rollAudio.current) {
      rollAudio.current.currentTime = 0;
      rollAudio.current.play().catch((e) => console.log("Audio play failed:", e));
    }

    // 4. Start rapid cycling of faces (80ms for chaotic rolling effect)
    rollIntervalRef.current = setInterval(() => {
      setRollingValues(() => {
        const next = [];
        for (let i = 0; i < 5; i++) {
          next.push(Math.floor(Math.random() * 6) + 1);
        }
        return next;
      });
    }, 80);

    // 5. Set the final settle timer. This will ALWAYS be 1000ms from your LAST click.
    rollTimeoutRef.current = setTimeout(() => {
      if (rollIntervalRef.current) clearInterval(rollIntervalRef.current);
      
      setDiceValues(() => {
        const finalValues = [0, 0, 0, 0, 0];
        for (let i = 0; i < 5; i++) {
          finalValues[i] = Math.floor(Math.random() * 6) + 1;
        }
        return finalValues;
      });

      setIsRolling(false);
      setIsRolled(true);
    }, 1000); 
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
    
    // Alternating diagonal shake: die 1 -> upper-left to bottom-right (a),
    // die 2 -> upper-right to bottom-left (b), repeating for the rest.
    const shakeDir = index % 2 === 0 ? 'a' : 'b';
    // Added rollTrigger to the key to force CSS animation to restart
    const cardClass = `dice-card${isRolling ? ` shaking shake-diag-${shakeDir} roll-anim-${rollTrigger}` : ''}`;

    if (!isShowingValue) {
      return (
        <div key={index} className="grid-cell">
          <div className={cardClass}></div>
        </div>
      );
    }

    if (displayValue === 1) {
      return (
        <div key={index} className="grid-cell">
          <div className={cardClass}>
            <img src={llamaImg} className="llama-img" alt="Llama" />
          </div>
        </div>
      );
    }

    return (
      <div key={index} className="grid-cell">
        <div className={cardClass}>
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