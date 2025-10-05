"use client";

import { useRef, useState, useEffect } from "react";
import {
  Box,
  HStack,
  useColorModeValue,
  Fade,
  ScaleFade,
  SlideFade,
  Button,
  Badge,
  useToast,
  Spinner,
} from "@chakra-ui/react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useSignalWS } from "../context/SignalWSProvider";
import LanguageSelector from "../components/LanguageSelector";
import { CODE_SNIPPETS } from "../constants";
import Output from "../components/Output";
import QuestionBox from "../components/QuestionBox";
import { RealTimeMonaco } from "../components/RealTimeMonaco";
import "./CodeEditor.css";

const MotionBox = motion(Box);
const MotionHStack = motion(HStack);

// Hash helper for submit voting
async function sha256Hex(str: string) {
  const enc = new TextEncoder().encode(str);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Client-side guard for languages currently enabled on the server
const ALLOWED_LANGS = new Set(["javascript", "python"]);

const CodeEditor = () => {
  const [searchParams] = useSearchParams();
  const roomId = searchParams.get("roomId") || "missing-room";
  const navigate = useNavigate();

  const editorRef = useRef<{ getValue: () => string } | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [editorMounted, setEditorMounted] = useState(false);
  const [showMainContent, setShowMainContent] = useState(false);
  const [question, setQuestion] = useState<any | null>(null);

  // Language states: agreed (server) vs display (local preview)
  const [agreedLanguage, setAgreedLanguage] =
    useState<keyof typeof CODE_SNIPPETS>("javascript");
  const [displayLanguage, setDisplayLanguage] =
    useState<keyof typeof CODE_SNIPPETS>("javascript");

  // Voting UI states
  const [pendingLang, setPendingLang] = useState<string | null>(null);
  const [langVoteProgress, setLangVoteProgress] = useState<{
    language: string;
    votesFor: number;
    total: number;
  } | null>(null);
  const [submitProgress, setSubmitProgress] = useState<{
    votes: number;
    total: number;
  } | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  const toast = useToast();
  const { send, on, status } = useSignalWS();

  const bgGradient = useColorModeValue(
    "linear(to-br, purple.800, purple.900, blue.900)",
    "linear(to-br, purple.800, purple.900, blue.900)"
  );

  useEffect(() => {
    setIsLoaded(true);
    const timer = setTimeout(() => setShowMainContent(true), 300);
    return () => clearTimeout(timer);
  }, []);

  // Language vote + preview
  const onSelect = (lang: keyof typeof CODE_SNIPPETS) => {
    const langStr = String(lang);
    if (!ALLOWED_LANGS.has(langStr)) {
      toast({
        status: "info",
        title: "Language not supported yet",
        description: "Only JavaScript and Python are enabled right now.",
      });
      setPendingLang(null);
      setDisplayLanguage(agreedLanguage);
      return;
    }
    setPendingLang(langStr);
    setDisplayLanguage(lang);
    send({ type: "LANGUAGE_VOTE", data: { language: langStr } });
  };

  const onMount = (editor: any) => {
    editorRef.current = editor;
    editor.focus();
    setEditorMounted(true);
  };

  // Request question when signal WS opens and when agreed language changes
  useEffect(() => {
    if (status !== "open") return;

    const offQuestion = on("QUESTION_DETAILS", (msg: any) =>
      setQuestion(msg.data)
    );
    send({ type: "REQUEST_QUESTION", data: { language: agreedLanguage } });

    return () => {
      offQuestion();
    };
  }, [status, agreedLanguage, on, send]);

  // Subscribe to language voting events
  useEffect(() => {
    if (status !== "open") return;

    const offSet = on("LANGUAGE_SET", (m: any) => {
      const newLang = m.data.language as keyof typeof CODE_SNIPPETS;
      setAgreedLanguage(newLang);
      setDisplayLanguage(newLang);
      setPendingLang(null);
      setLangVoteProgress(null);
      send({ type: "REQUEST_QUESTION", data: { language: newLang } });
      toast({ status: "success", title: `Language set to ${newLang}` });
    });

    const offProgress = on("LANGUAGE_VOTE_PROGRESS", (m: any) => {
      setLangVoteProgress(m.data);
    });

    const offRejected = on("LANGUAGE_VOTE_REJECTED", (m: any) => {
      setPendingLang(null);
      setDisplayLanguage(agreedLanguage); // revert preview
      const until = m.data?.until
        ? ` (until ${new Date(m.data.until).toLocaleTimeString()})`
        : "";
      let desc = `Current: ${m.data?.current ?? ""}${until}`;
      if (m.data?.reason === "UNSUPPORTED_LANGUAGE") {
        desc =
          "Only JavaScript and Python are enabled right now." +
          (Array.isArray(m.data.allowed)
            ? ` Allowed: ${m.data.allowed.join(", ")}`
            : "");
      }
      toast({
        status: "info",
        title:
          m.data?.reason === "UNSUPPORTED_LANGUAGE"
            ? "Language not supported"
            : "Language change locked",
        description: desc,
      });
    });

    // Fallback: older server might send ERROR on unsupported language
    const offError = on("ERROR", (m: any) => {
      if ((m.message || "").toLowerCase().includes("unsupported language")) {
        setPendingLang(null);
        setDisplayLanguage(agreedLanguage);
        toast({
          status: "info",
          title: "Language not supported",
          description: "Only JavaScript and Python are enabled right now.",
        });
      }
    });

    return () => {
      offSet();
      offProgress();
      offRejected();
      offError();
    };
  }, [status, on, send, toast, agreedLanguage]);

  // Subscribe to submit voting events
  useEffect(() => {
    if (status !== "open") return;

    const offProg = on("SUBMIT_PROGRESS", (m: any) => {
      setSubmitProgress(m.data);
    });
    const offConflict = on("SUBMIT_CONFLICT", (m: any) => {
      setSubmitProgress(null);
      setIsEvaluating(false);
      toast({
        status: "warning",
        title: "Submit mismatch",
        description: m.data.reason.replace("_", " "),
      });
    });
    const offStarted = on("SUBMIT_STARTED", () => {
      setIsEvaluating(true);
    });
    const offSuccess = on("SUBMIT_SUCCESS", (m: any) => {
      setIsEvaluating(false);
      setSubmitProgress(null);
      toast({
        status: "success",
        title: "Accepted ✔",
        description: m.data?.message || "",
      });
      // Redirect both clients to homepage
      navigate("/");
    });
    const offFail = on("SUBMIT_FAIL", (m: any) => {
      setIsEvaluating(false);
      setSubmitProgress(null);
      toast({
        status: "error",
        title: "Wrong Answer",
        description: m.data?.message || "",
      });
    });

    return () => {
      offProg();
      offConflict();
      offStarted();
      offSuccess();
      offFail();
    };
  }, [status, on, toast, navigate]);

  const handleSubmitClick = async () => {
    if (!editorRef.current) return;
    const code = editorRef.current.getValue();
    const hash = await sha256Hex(code);
    send({
      type: "SUBMIT_REQUEST",
      data: { language: String(agreedLanguage), codeHash: hash, code },
    });
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
              x:
                Math.random() *
                (typeof window !== "undefined" ? window.innerWidth : 1200),
              y:
                Math.random() *
                (typeof window !== "undefined" ? window.innerHeight : 800),
              opacity: 0,
            }}
            animate={{
              y: [null, -20, 20],
              opacity: [0, 0.6, 0],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
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
              {/* Top bar: language voting + submit voting UI */}
              <HStack justify="space-between" mb={2} pt={2}>
                <Box>
                  <LanguageSelector
                    language={displayLanguage}
                    onSelect={onSelect}
                  />
                  {pendingLang && (
                    <Badge ml={2} colorScheme="purple">
                      Voted: {pendingLang}
                    </Badge>
                  )}
                  {langVoteProgress && (
                    <Badge ml={2} colorScheme="pink">
                      {langVoteProgress.language}: {langVoteProgress.votesFor}/
                      {langVoteProgress.total}
                    </Badge>
                  )}
                  {agreedLanguage !== displayLanguage && (
                    <Badge ml={2} colorScheme="yellow">
                      Preview
                    </Badge>
                  )}
                </Box>
                <Button
                  colorScheme="green"
                  onClick={handleSubmitClick}
                  isDisabled={isEvaluating}
                  variant="outline"
                  background={"green.900"}
                  _hover={{ background: "green.600" }}
                >
                  {isEvaluating ? <Spinner size="sm" mr={2} /> : null}
                  Submit{" "}
                  {submitProgress
                    ? `(${submitProgress.votes}/${submitProgress.total})`
                    : ""}
                </Button>
              </HStack>

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
                  borderColor: "pink.200",
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
                  transition: "opacity 0.5s ease",
                }}
              >
                <AnimatePresence mode="wait">
                  <MotionBox
                    key={displayLanguage}
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
                        cursorSmoothCaretAnimation: "on",
                      }}
                      theme="vs-dark"
                      language={displayLanguage} // instant preview fixes false errors
                      defaultValue={CODE_SNIPPETS[agreedLanguage] ?? ""} // ensure string
                      onMount={onMount}
                      height="75vh"
                      WebsocketURL="ws://localhost:10000/yjs"
                      roomId={roomId}
                      color="#ff0000"
                      name="YourName"
                    />
                  </MotionBox>
                </AnimatePresence>
              </MotionBox>
            </MotionBox>

            {/* Right Column: Output (optional local run UI) */}
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
                <Output editorRef={editorRef} language={agreedLanguage} />
              </ScaleFade>
            </MotionBox>
          </MotionHStack>
        </Fade>
      </Box>
    </MotionBox>
  );
};

export default CodeEditor;