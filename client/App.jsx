import React, { useState } from 'react';

function App() {
  const [move, setMove] = useState("");
  const [history, setHistory] = useState([]);
  const [analysis, setAnalysis] = useState("");

  const handleAnalyze = () => {
    if (move.trim() === "") return;
    setHistory([...history, move]);
    // Placeholder for analysis result
    setAnalysis(`Analysis for move '${move}': This is a placeholder result.`);
    setMove("");
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f5f5f5' }}>
      <div style={{ background: '#fff', padding: '32px 40px', borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', minWidth: '350px', textAlign: 'center' }}>
        <h1 style={{ color: '#2d2d2d', marginBottom: '16px' }}>AI Chess Analyzer</h1>
        <p style={{ color: '#555', marginBottom: '24px' }}>Analyze your chess moves with AI!</p>
        <input
          type="text"
          placeholder="Enter chess move (e.g. e2e4)"
          value={move}
          onChange={e => setMove(e.target.value)}
          style={{ padding: '10px', width: '80%', borderRadius: '6px', border: '1px solid #ccc', marginBottom: '16px' }}
        />
        <br />
        <button
          onClick={handleAnalyze}
          style={{ padding: '10px 24px', borderRadius: '6px', background: '#4f8cff', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px', marginBottom: '16px' }}
        >
          Analyze Move
        </button>
        {history.length > 0 && (
          <div style={{ marginTop: '16px', textAlign: 'left' }}>
            <h3 style={{ color: '#2d2d2d' }}>Move History</h3>
            <ul style={{ paddingLeft: '20px', color: '#444' }}>
              {history.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          </div>
        )}
        {analysis && (
          <div style={{ marginTop: '16px', background: '#f0f4ff', padding: '12px', borderRadius: '8px', color: '#2d2d2d' }}>
            <strong>Result:</strong> {analysis}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
