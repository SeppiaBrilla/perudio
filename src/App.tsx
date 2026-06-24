import { useState, useEffect } from 'react';
import { App as CapApp } from '@capacitor/app';
import llamaImg from './assets/llama.png';
import './App.css';

function App() {
  const [screen, setScreen] = useState<'start' | 'game' | 'hidden'>('start');
  const [activeDice, setActiveDice] = useState<number>(5);
  const [diceValues, setDiceValues] = useState<number[]>([0, 0, 0, 0, 0]);
  const [isRolled, setIsRolled] = useState<boolean>(false);

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
    if (activeDice === 0) {
      if (window.confirm("No dice left! Restart game?")) {
        resetGame();
      }
      return;
    }
    const newValues = [...diceValues];
    for (let i = 0; i < 5; i++) {
      if (i < activeDice) {
        newValues[i] = Math.floor(Math.random() * 6) + 1;
      } else {
        newValues[i] = 0; // inactive
      }
    }
    setDiceValues(newValues);
    setIsRolled(true);
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
    // If this die has been lost
    if (index >= activeDice) {
      return (
        <div key={index} className="grid-cell">
          <div className="dice-card-inactive"></div>
        </div>
      );
    }

    // If active but not rolled yet
    if (!isRolled) {
      return (
        <div key={index} className="grid-cell">
          <div className="dice-card"></div>
        </div>
      );
    }

    // If rolled and shows 1 (Llama)
    if (value === 1) {
      return (
        <div key={index} className="grid-cell">
          <div className="dice-card">
            <img src={llamaImg} className="llama-img" alt="Llama" />
          </div>
        </div>
      );
    }

    // Standard numbers 2-6
    return (
      <div key={index} className="grid-cell">
        <div className="dice-card">
          {dotPositions[value]?.map((pos) => (
            <div key={pos} className={`dot dot-${pos}`}></div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="app-container">
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
  );
}

export default App;
