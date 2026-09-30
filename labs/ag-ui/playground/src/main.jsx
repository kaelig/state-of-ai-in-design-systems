import { createRoot } from 'react-dom/client';
import { App } from './App.jsx';
import './app.css';

createRoot(/** @type {HTMLElement} */ (document.getElementById('root'))).render(<App />);
