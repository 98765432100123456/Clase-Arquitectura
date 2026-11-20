import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
// [CineMax mejoras] Capa visual premium (archivo nuevo, no cambia la paleta)
import './cinemax/styles/premium.css';

createRoot(document.getElementById('root')!).render(<App />);
