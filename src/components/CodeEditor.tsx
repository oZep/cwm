import { useRef, useState, useEffect } from "react";
import { 
  Box, 
  HStack, 
  useColorModeValue,
  Fade,
  ScaleFade,
  SlideFade,
  useToast
} from "@chakra-ui/react";
import { motion, AnimatePresence } from "framer-motion";
import LanguageSelector from "./LanguageSelector";
import { CODE_SNIPPETS } from "../constants";
import Output from "./Output";
import QuestionBox from "./QuestionBox";
import { RealTimeMonaco } from "./RealTimeMonaco";
import { useSearchParams } from 'react-router-dom';

const MotionBox = motion(Box);
const MotionHStack = motion(HStack);

// Helper to get URL parameters
const getUrlParam = (name: string): string | null => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
};

const CodeEditor = () => {
  const [searchParams] = useSearchParams();
  const editorRef = useRef<{ getValue: () => string } | null>(null);
  const [value, setValue] = useState("");
  const [language, setLanguage] = useState<keyof typeof CODE_SNIPPETS>("javascript");
  const [isLoaded, setIsLoaded] = useState(false);
  const [editorMounted, setEditorMounted] = useState(false);
  const [showMainContent, setShowMainContent] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [status, setStatus] = useState("connecting");
  const toast = useToast();

  // Get room ID from URL
  const roomId = searchParams.get('room') || `room-${Date.now()}`;
  
  // Enhanced color scheme
  const bgGradient = useColorModeValue(
    "linear(to-br, purple.800, purple.900, blue.900)",
    "linear(to-br, purple.800, purple.900, blue.900)"
  );

  useEffect(() => {
    setIsLoaded(true);
    const timer = setTimeout(() => {
      setShowMainContent(true);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // WebSocket connection effect
  useEffect(() => {
    const websocket = new WebSocket(`ws://localhost:1234/${roomId}`);
    setWs(websocket);
    setStatus("connecting");

    websocket.onopen = () => {
      console.log("WebSocket connected");
      // Send JOIN message
      websocket.send(JSON.stringify({ type: "JOIN" }));
    };

    websocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log("Received:", message);
        
        if (message.type === "WAITING") {
          setStatus("waiting");
          toast({
            title: "Looking for a partner",
            description: "Please wait while we find you a coding buddy...",
            status: "info",
            duration: null,
            isClosable: true,
          });
        } 
        else if (message.type === "ROOM_READY") {
          setStatus("ready");
          toast({
            title: "Partner found!",
            description: "You can now start coding together",
            status: "success",
            duration: 5000,
          });
        }
        else if (message.type === "QUESTION_DETAILS") {
          // Handle question details
          console.log("Question:", message.data);
        }
        else if (message.type === "ERROR") {
          toast({
            title: "Error",
            description: message.message,
            status: "error",
            duration: 5000,
          });
        }
      } catch (e) {
        console.error("Error parsing message:", e);
      }
    };

    websocket.onclose = () => {
      console.log("WebSocket disconnected");
      setStatus("disconnected");
      toast({
        title: "Connection lost",
        description: "Trying to reconnect...",
        status: "warning",
        duration: 3000,
      });
    };

    websocket.onerror = (error) => {
      console.error("WebSocket error:", error);
      setStatus("error");
    };

    return () => {
      websocket.close();
    };
  }, [roomId, toast]);

  const onSelect = (language: keyof typeof CODE_SNIPPETS) => {
    setLanguage(language);
    setValue(CODE_SNIPPETS[language]);
  };

  const onMount = (editor: any) => {
    editorRef.current = editor;
    editor.focus();
    setEditorMounted(true);
  };

  // Request question when ready
  const requestQuestion = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: "REQUEST_QUESTION",
        data: { language }
      }));
    }
  };

  return (
    <MotionBox 
      bgGradient={bgGradient}
      minHeight="100vh" 
      py={4}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      {/* Animated background particles */}
      <Box
        position="absolute"
        top={0}
        left={0}
        right={0}
        bottom={0}
        overflow="hidden"
        pointerEvents="none"
        zIndex={0}
      >
        {[...Array(20)].map((_, i) => (
          <MotionBox
            key={i}
            position="absolute"
            width="2px"
            height="2px"
            bg="whiteAlpha.200"
            borderRadius="full"
            initial={{
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1200),
              y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800),
              opacity: 0
            }}
            animate={{
              y: [null, -20, 20],
              opacity: [0, 0.6, 0]
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2
            }}
          />
        ))}
      </Box>

      <Box position="relative" zIndex={1}>
        <SlideFade in={isLoaded} offsetY="20px">
          <QuestionBox 
            question={status === "waiting" 
              ? "Looking for your coding partner..." 
              : status === "ready" 
                ? "Partner connected! Start coding together" 
                : "Connecting to session..."} 
          />
        </SlideFade>

        <Fade in={showMainContent}>
          <MotionHStack 
            spacing={4} 
            mx={10} 
            my={1}
            align="stretch"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            {/* Left Column: Editor */}
            <MotionBox 
              flex={1}
              whileHover={{ scale: 1.002 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <ScaleFade in={isLoaded} initialScale={0.95}>
                <Box mb={3}>
                  <LanguageSelector language={language} onSelect={onSelect} />
                </Box>
              </ScaleFade>

              <MotionBox
                borderColor="pink.100"
                borderWidth={1}
                borderRadius={8}
                background="blue.900"
                boxShadow="0 8px 32px rgba(0, 0, 0, 0.3)"
                overflow="hidden"
                position="relative"
                initial={{ scale: 0.98, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.5 }}
                whileHover={{ 
                  boxShadow: "0 12px 40px rgba(0, 0, 0, 0.4)",
                  borderColor: "pink.200"
                }}
                _before={{
                  content: '""',
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "2px",
                  bgGradient: "linear(to-r, pink.400, purple.400, blue.400)",
                  opacity: editorMounted ? 1 : 0,
                  transition: "opacity 0.5s ease"
                }}
              >
                <AnimatePresence mode="wait">
                  <MotionBox
                    key={language}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.3 }}
                  >
                    <RealTimeMonaco
                      options={{
                        minimap: {
                          enabled: false,
                        },
                        fontSize: 14,
                        lineHeight: 1.6,
                        padding: { top: 16, bottom: 16 },
                        smoothScrolling: true,
                        cursorBlinking: "smooth",
                        cursorSmoothCaretAnimation: "on",
                      }}
                      theme="vs-dark"
                      language={language}
                      defaultValue={CODE_SNIPPETS[language]}
                      onMount={onMount}
                      value={value}
                      height="75vh"
                      WebsocketURL={`ws://localhost:1234/${roomId}`}
                      roomId={roomId}
                      color="#ff0000"
                      name="YourName"
                    />
                  </MotionBox>
                </AnimatePresence>
              </MotionBox>
            </MotionBox>
            
            {/* Right Column: Output */}
            <MotionBox
              flex={1}
              display="flex"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.6 }}
              whileHover={{ scale: 1.002 }}
            >
              <ScaleFade 
                in={isLoaded} 
                initialScale={0.95} 
                style={{ display: 'flex', flex: 5, flexDirection: 'column' }}
              >
                  <Output editorRef={editorRef} language={language} />
              </ScaleFade>
            </MotionBox>
          </MotionHStack>
        </Fade>
      </Box>
    </MotionBox>
  );
};

export default CodeEditor;