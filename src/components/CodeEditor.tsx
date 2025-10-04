import { useRef, useState } from "react";
import { Box, HStack } from "@chakra-ui/react";
import LanguageSelector from "./LanguageSelector";
import { CODE_SNIPPETS } from "../constants";
import Output from "./Output";
import QuestionBox from "./QuestionBox";
import { RealTimeMonaco } from "./RealTimeMonaco";

const CodeEditor = () => {
  const editorRef = useRef<{ getValue: () => string } | null>(null);
  const [value, setValue] = useState("");
  const [language, setLanguage] =
    useState<keyof typeof CODE_SNIPPETS>("javascript");

  // Removed duplicate onMount declaration
  const onSelect = (language: keyof typeof CODE_SNIPPETS) => {
    setLanguage(language);
    setValue(CODE_SNIPPETS[language]);
  };
  const onMount = (editor: any) => {
    editorRef.current = editor;
    editor.focus();
  };

  return (
    <Box background={"purple.800"} minHeight="100vh" py={4}>
      <QuestionBox question={"What is the capital of France?"} />{" "}
      {/* This will be supplimented by an api call */}
      <HStack spacing={4} mx={10} my={1}>
        <Box w="50%">
          <LanguageSelector language={language} onSelect={onSelect} />
          <Box
            borderColor={"pink.100"}
            borderWidth={1}
            borderRadius={4}
            background={"blue.900"}
          >
            <RealTimeMonaco
              options={{
                minimap: {
                  enabled: false,
                },
              }}
              theme="vs-dark"
              language={language}
              defaultValue={CODE_SNIPPETS[language]}
              onMount={onMount}
              value={value}
              height="75vh"
              roomId="unique-room-id"
              color="#ff0000"
              name="YourName"
            />
          </Box>
        </Box>
        <Output editorRef={editorRef} language={language} />
      </HStack>
    </Box>
  );
};
export default CodeEditor;
