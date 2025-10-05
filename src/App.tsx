'use client';

import { ChakraProvider } from '@chakra-ui/react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SignalWSProvider } from './context/SignalWSProvider';
import HomePage from './components/Homepage';
import CodeEditor from './components/CodeEditor';

// Use wss in production (https) and ws locally. With Vite proxy, using window.host works in dev too.
const wsProto =
  typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss' : 'ws';
const WS_BASE =
  typeof window !== 'undefined' ? `${wsProto}://${window.location.host}` : 'ws://localhost:10000';

export default function App() {
  return (
    <ChakraProvider>
      <SignalWSProvider url={`${WS_BASE}/signal`}>
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