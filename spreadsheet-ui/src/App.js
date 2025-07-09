import React, { useState } from 'react';
import './App.css';

function App() {
  // Initial columns and data
  const [columns, setColumns] = useState([
    'First Name',
    'Last Name',
    'Major',
  ]);
  const [data, setData] = useState([
    { 'First Name': 'Alice', 'Last Name': 'Smith', Major: 'Computer Science' },
    { 'First Name': 'Bob', 'Last Name': 'Johnson', Major: 'Mathematics' },
    { 'First Name': 'Charlie', 'Last Name': 'Lee', Major: 'English' },
  ]);

  // Add a new row
  const addRow = () => {
    const newRow = {};
    columns.forEach(col => (newRow[col] = ''));
    setData([...data, newRow]);
  };

  // Add a new column
  const addColumn = () => {
    const newCol = prompt('Enter new column name:');
    if (!newCol || columns.includes(newCol)) return;
    setColumns([...columns, newCol]);
    setData(data.map(row => ({ ...row, [newCol]: '' })));
  };

  // Update cell value
  const updateCell = (rowIdx, col, value) => {
    const newData = [...data];
    newData[rowIdx] = { ...newData[rowIdx], [col]: value };
    setData(newData);
  };

  // Remove a row
  const removeRow = (rowIdx) => {
    if (data.length > 1) {
      const newData = data.filter((_, index) => index !== rowIdx);
      setData(newData);
    } else {
      // If it's the last row, clear all data but keep the structure
      const emptyRow = {};
      columns.forEach(col => (emptyRow[col] = ''));
      setData([emptyRow]);
    }
  };

  // Remove a column
  const removeColumn = (colToRemove) => {
    if (columns.length > 1) { // Keep at least one column
      const newColumns = columns.filter(col => col !== colToRemove);
      setColumns(newColumns);
      setData(data.map(row => {
        const newRow = { ...row };
        delete newRow[colToRemove];
        return newRow;
      }));
    }
  };

  // Drag and drop functions
  const handleDragStart = (e, item, type) => {
    setDraggedItem(item);
    setDragType(type);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = (e) => {
    setDraggedItem(null);
    setDragType(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetItem, type) => {
    e.preventDefault();
    
    if (dragType === 'column' && type === 'column') {
      const fromIndex = columns.indexOf(draggedItem);
      const toIndex = columns.indexOf(targetItem);
      
      if (fromIndex !== toIndex) {
        const newColumns = [...columns];
        const [movedColumn] = newColumns.splice(fromIndex, 1);
        newColumns.splice(toIndex, 0, movedColumn);
        setColumns(newColumns);
      }
    } else if (dragType === 'row' && type === 'row') {
      const fromIndex = parseInt(draggedItem);
      const toIndex = parseInt(targetItem);
      
      if (fromIndex !== toIndex) {
        const newData = [...data];
        const [movedRow] = newData.splice(fromIndex, 1);
        newData.splice(toIndex, 0, movedRow);
        setData(newData);
      }
    }
  };

  // State for remove mode
  const [removeRowMode, setRemoveRowMode] = useState(false);
  const [removeColumnMode, setRemoveColumnMode] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // Force re-render when dark mode changes
  const [renderKey, setRenderKey] = useState(0);
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragType, setDragType] = useState(null); // 'column' or 'row'

  // Generate column via LLM
  const generateLLMColumn = async () => {
    const userPrompt = prompt('Enter a prompt for LLM generation (e.g., "Classify as Engineer or Non-Engineer"):');
    if (!userPrompt) return;

    console.log('Sending data to LLM:', { columns, data, prompt: userPrompt });

    try {
      const response = await fetch('http://127.0.0.1:8000/llm-complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          columns: columns,
          data: data,
          prompt: userPrompt
        })
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        throw new Error(`Failed to generate column: ${response.status}`);
      }

      const result = await response.json();
      console.log('LLM result:', result);
      
      // Add the new column with generated values
      setColumns([...columns, result.new_column]);
      setData(data.map((row, idx) => ({
        ...row,
        [result.new_column]: result.values[idx] || ''
      })));

      console.log('Column added successfully');

    } catch (error) {
      console.error('Error generating LLM column:', error);
      alert(`Failed to generate column: ${error.message}. Make sure the backend server is running.`);
    }
  };

  return (
    <div className={`App ${darkMode ? 'dark-mode' : ''}`}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
        <button
          onClick={() => {
            setDarkMode(!darkMode);
            setRenderKey(prev => prev + 1);
          }}
          style={{
            background: darkMode ? '#fbbf24' : '#1f2937',
            color: darkMode ? '#1f2937' : '#fbbf24',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '8px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}
        >
          {darkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
        </button>
      </div>
            <h1 style={{ textAlign: 'center', marginBottom: '20px' }}>Student Spreadsheet</h1>
      <div className={`spreadsheet-container ${darkMode ? 'dark-mode' : ''}`}>
        <table className={`spreadsheet-table ${darkMode ? 'dark-mode' : ''}`} key={`table-${renderKey}`}>
          <thead>
            <tr>
              {removeRowMode && <th style={{ width: '50px' }}>Actions</th>}
              {columns.map(col => (
                <th 
                  key={`${col}-${renderKey}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, col, 'column')}
                  onDragEnd={handleDragEnd}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, col, 'column')}
                  style={{
                    cursor: 'grab',
                    userSelect: 'none',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ flex: 1 }}>{col}</span>
                    {removeColumnMode && (
                      <button
                        key={`col-remove-${col}-${renderKey}`}
                        onClick={() => removeColumn(col)}
                        style={{
                          background: darkMode ? 'rgba(239, 68, 68, 0.8)' : 'rgba(255,255,255,0.2)',
                          border: 'none',
                          color: 'white',
                          borderRadius: '4px',
                          padding: '2px 6px',
                          fontSize: '10px',
                          cursor: 'pointer',
                          marginLeft: '8px',
                          transition: 'all 0.2s ease'
                        }}
                        title="Remove column"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIdx) => (
              <tr 
                key={`${rowIdx}-${renderKey}`}
                draggable
                onDragStart={(e) => handleDragStart(e, rowIdx.toString(), 'row')}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, rowIdx.toString(), 'row')}
                style={{
                  cursor: 'grab',
                  userSelect: 'none'
                }}
              >
                {removeRowMode && (
                  <td style={{ padding: '8px', textAlign: 'center' }}>
                    <button
                      key={`row-remove-${rowIdx}-${renderKey}`}
                      onClick={() => removeRow(rowIdx)}
                      style={{
                        background: darkMode ? '#dc2626' : '#ef4444',
                        border: 'none',
                        color: 'white',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      title="Remove row"
                    >
                      ×
                    </button>
                  </td>
                )}
                {columns.map(col => (
                  <td key={`${col}-${rowIdx}-${renderKey}`}>
                    <input
                      value={row[col] || ''}
                      onChange={e => updateCell(rowIdx, col, e.target.value)}
                      className={`spreadsheet-input ${darkMode ? 'dark-mode' : ''}`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div className={`spreadsheet-actions ${darkMode ? 'dark-mode' : ''}`}>
          <button onClick={addRow}>Add Row</button>
          <button onClick={addColumn}>Add Column</button>
          <button onClick={generateLLMColumn}>Generate Column</button>
          <button 
            onClick={() => {
              setRemoveRowMode(!removeRowMode);
              setRemoveColumnMode(false);
            }}
            style={{
              background: removeRowMode ? '#ef4444' : 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)'
            }}
          >
            {removeRowMode ? 'Cancel Remove Rows' : 'Remove Rows'}
          </button>
          <button 
            onClick={() => {
              setRemoveColumnMode(!removeColumnMode);
              setRemoveRowMode(false);
            }}
            style={{
              background: removeColumnMode ? '#ef4444' : 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)'
            }}
          >
            {removeColumnMode ? 'Cancel Remove Columns' : 'Remove Columns'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
