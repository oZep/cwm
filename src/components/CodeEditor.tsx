'use client';

import { useRef, useState, useEffect } from "react";
import {
  Box,
  HStack,
  useColorModeValue,
  Fade,
  ScaleFade,
  SlideFade,
  Text
} from "@chakra-ui/react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "react-router-dom";
import { useSignalWS } from "../context/SignalWSProvider";
import LanguageSelector from "./LanguageSelector";
import { CODE_SNIPPETS } from "../constants";
import Output from "./Output";
import QuestionBox from "./QuestionBox";
import { RealTimeMonaco } from "./RealTimeMonaco";

const MotionBox = motion(Box);
const MotionHStack = motion(HStack);

const CodeEditor = () => {
  const [searchParams] = useSearchParams();
  const roomId = searchParams.get("roomId") || "missing-room";

  const editorRef = useRef<{ getValue: () => string } | null>(null);
  const [value, setValue] = useState("");
  const [language, setLanguage] = useState<keyof typeof CODE_SNIPPETS>("javascript");
  const [isLoaded, setIsLoaded] = useState(false);
  const [editorMounted, setEditorMounted] = useState(false);
  const [showMainContent, setShowMainContent] = useState(false);
  const [question, setQuestion] = useState<any | null>(null);

  const { send, on, status } = useSignalWS();

  // Background gradient
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

  const onSelect = (lang: keyof typeof CODE_SNIPPETS) => {
    setLanguage(lang);
    setValue(CODE_SNIPPETS[lang]);

    // Ask server for a question variant for this language
    if (status === "open") {
      send({ type: "REQUEST_QUESTION", data: { language: lang } });
    }
  };

  const onMount = (editor: any) => {
    editorRef.current = editor;
    editor.focus();
    setEditorMounted(true);
  };

  // Subscribe to question updates and request on load
  useEffect(() => {
    if (status !== "open") return;

    const offQuestion = on("QUESTION_DETAILS", (msg: any) => {
      setQuestion(msg.data);
    });

    // Initial request (server will keep same question per room or assign once)
    send({ type: "REQUEST_QUESTION", data: { language } });

    return () => {
      offQuestion();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

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
              x: Math.random() * (typeof window !== "undefined" ? window.innerWidth : 1200),
              y: Math.random() * (typeof window !== "undefined" ? window.innerHeight : 800),
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
          <QuestionBox question={question?.content || "Loading question..."} />
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
                        minimap: { enabled: false },
                        fontSize: 14,
                        lineHeight: 1.6,
                        padding: { top: 16, bottom: 16 },
                        smoothScrolling: true,
                        cursorBlinking: "smooth",
                        cursorSmoothCaretAnimation: "on"
                      }}
                      theme="vs-dark"
                      language={language}
                      defaultValue={CODE_SNIPPETS[language]}
                      onMount={onMount}
                      value={value}
                      height="75vh"
                      // Yjs provider websocket (same Node server, different path)
                      WebsocketURL="ws://localhost:1234/yjs"
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
                style={{ display: "flex", flex: 5, flexDirection: "column" }}
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