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
  // Per-die diagonal shake direction: 'a' = upper-left <-> bottom-right, 'b' = upper-right <-> bottom-left
  const [shakeDirs, setShakeDirs] = useState<('a' | 'b')[]>(['a', 'a', 'a', 'a', 'a']);

  const rollAudio = useRef<HTMLAudioElement | null>(null);

  // Preload shake audio
  useEffect(() => {
    rollAudio.current = new Audio(shakeMp3);
    rollAudio.current.load();
  }, []);

  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>(
    window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'
  );

  // Track screen orientation changes
  useEffect(() => {
    const handleResize = () => {
      setOrientation(window.innerWidth > window.innerHeight ? 'landscape' : 'portrait');
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Clear/reset dice if they are visible and the orientation is landscape
  useEffect(() => {
    if (orientation === 'landscape' && screen === 'game' && isRolled) {
      setIsRolled(false);
      setDiceValues([0, 0, 0, 0, 0]);
    }
  }, [orientation, screen, isRolled]);

  // Handle hardware back button on Android (exit app if on start screen, go back to start if on board)
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
    if (isRolling) return;
    if (activeDice === 0) {
      if (window.confirm("No dice left! Restart game?")) {
        resetGame();
      }
      return;
    }

    setIsRolling(true);

    // Pick a random diagonal shake direction per die for this roll
    setShakeDirs(Array.from({ length: 5 }, () => (Math.random() < 0.5 ? 'a' : 'b')));
    
    // Play preloaded shake audio instantly
    if (rollAudio.current) {
      rollAudio.current.currentTime = 0;
      rollAudio.current.play().catch((e) => console.log("Audio play failed:", e));
    }

    // Cycle through random faces (keeps same face for 160ms - double the previous 80ms)
    const intervalId = setInterval(() => {
      setRollingValues(() => {
        const next = [];
        for (let i = 0; i < 5; i++) {
          next.push(Math.floor(Math.random() * 6) + 1);
        }
        return next;
      });
    }, 160);

    // Land after 1000ms
    setTimeout(() => {
      clearInterval(intervalId);
      const finalValues = [...diceValues];
      for (let i = 0; i < 5; i++) {
        if (i < activeDice) {
          finalValues[i] = Math.floor(Math.random() * 6) + 1;
        } else {
          finalValues[i] = 0;
        }
      }
      setDiceValues(finalValues);
      setIsRolling(false);
      setIsRolled(true);
    }, 1000);
  };

  const loseDie = () => {
    if (isRolling) return;
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
    // If this die has been lost
    if (index >= activeDice) {
      return (
        <div key={index} className="grid-cell">
          <div className="dice-card-inactive"></div>
        </div>
      );
    }

    const displayValue = isRolling ? rollingValues[index] : value;
    const isShowingValue = isRolling || isRolled;
    const cardClass = `dice-card${isRolling ? ` shaking shake-diag-${shakeDirs[index]}` : ''}`;

    // If active but not rolled yet (neither rolling nor rolled)
    if (!isShowingValue) {
      return (
        <div key={index} className="grid-cell">
          <div className={cardClass}></div>
        </div>
      );
    }

    // If showing 1 (Llama)
    if (displayValue === 1) {
      return (
        <div key={index} className="grid-cell">
          <div className={cardClass}>
            <img src={llamaImg} className="llama-img" alt="Llama" />
          </div>
        </div>
      );
    }

    // Standard numbers 2-6
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

  // Determine slide direction based on screen ordering so forward navigation
  // slides in from the right and backward (undo) slides in from the left.
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
                  <button className="btn-gradient btn-lose-die" onClick={loseDie} disabled={isRolling}>
                    Lose a Die
                  </button>
                </div>
              </div>
              <button className="btn-gradient btn-roll" onClick={rollDice} disabled={isRolling}>
                Roll Dice
              </button>
              <button className="btn-gradient btn-hide" onClick={() => !isRolling && setScreen('hidden')} disabled={isRolling}>
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
