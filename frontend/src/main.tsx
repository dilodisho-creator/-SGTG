import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MotionIconConfig } from './animated-icons';
import './index.css';
import 'sileo/styles.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MotionIconConfig mode="signature" trigger="parent-hover" duration={0.45}>
      <App />
    </MotionIconConfig>
  </StrictMode>
);