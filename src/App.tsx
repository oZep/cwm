'use client';

import { ChakraProvider } from '@chakra-ui/react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SignalWSProvider } from './context/SignalWSProvider';
import HomePage from './components/Homepage';
import CodeEditor from './components/CodeEditor';

export default function App() {
  return (
    <ChakraProvider>
      <SignalWSProvider url="ws://localhost:10000/signal">
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/editor" element={<CodeEditor />} />
          </Routes>
        </BrowserRouter>
      </SignalWSProvider>
    </ChakraProvider>
  );
}
