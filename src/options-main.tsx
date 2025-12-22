/**
 * Entry point for the Options window.
 * 
 * This is the React entry point for the options.html page.
 * It renders the OptionsWindow component which provides the
 * settings/configuration interface.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { OptionsWindow } from './components/options';
import { ThemeProvider } from './context/ThemeContext';
import { IndividualHotkeysProvider } from './context/IndividualHotkeysContext';
import './App.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <ThemeProvider>
            <IndividualHotkeysProvider>
                <OptionsWindow />
            </IndividualHotkeysProvider>
        </ThemeProvider>
    </React.StrictMode>
);
