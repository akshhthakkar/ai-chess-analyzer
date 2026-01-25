import React from 'react';

function App() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f5f5f5' }}>
      <div style={{ background: '#fff', padding: '32px 40px', borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', minWidth: '350px', textAlign: 'center' }}>
        <h1 style={{ color: '#2d2d2d', marginBottom: '16px' }}>AI Chess Analyzer</h1>
        <p style={{ color: '#555', marginBottom: '24px' }}>Analyze your chess moves with AI!</p>
        <input
          type="text"
          placeholder="Enter chess move (e.g. e2e4)"
          style={{ padding: '10px', width: '80%', borderRadius: '6px', border: '1px solid #ccc', marginBottom: '16px' }}
        />
        <br />
        <button
          style={{ padding: '10px 24px', borderRadius: '6px', background: '#4f8cff', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }}
        >
          Analyze Move
        </button>
      </div>
    </div>
  );
}

export default App;
