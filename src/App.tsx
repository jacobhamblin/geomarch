import { useState, useEffect } from "react";

function App() {
  const [gameStarted, setGameStarted] = useState(false);

  useEffect(() => {
    if (gameStarted) {
      // @ts-ignore
      import("../public/game.ts").then((mod) => {
        const container = document.getElementById("game-container");
        if (container) mod.initGame(container);
      });
    }
    // Set background to black
    document.body.style.background = "black";
  }, [gameStarted]);

  // Max width: 600px, width: 100vw
  const maxWidth = 600;

  return (
    <>
      <style>{`
        #game-container {
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100vw;
          height: 100vh;
        }
        .game-canvas-wrapper {
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100vw;
          height: 100vh;
        }
        .game-canvas-inner {
          max-width: ${maxWidth}px;
          width: 100vw;
          height: 100vh;
          margin: 0 auto;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .start-btn-wrapper {
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100vw;
          height: 100vh;
        }
        body, html {
          background: black !important;
        }
      `}</style>
      {!gameStarted && (
        <div className="start-btn-wrapper">
          <button
            onClick={() => setGameStarted(true)}
            style={{ fontSize: "2rem", margin: "2rem" }}
          >
            Start Game
          </button>
        </div>
      )}
      {gameStarted && (
        <div className="game-canvas-wrapper">
          <div className="game-canvas-inner">
            <div id="game-container"></div>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
