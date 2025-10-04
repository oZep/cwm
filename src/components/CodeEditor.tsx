import { useRef, useState } from "react";
import { Box, HStack } from "@chakra-ui/react";
import { Editor } from "@monaco-editor/react";
import LanguageSelector from "./LanguageSelector";
import { CODE_SNIPPETS } from "../constants";
import Output from "./Output";
import QuestionBox from "./QuestionBox";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { MonacoBinding } from "y-monaco";

const CodeEditor = () => {
  const editorRef = useRef();
  const [value, setValue] = useState("");
  const [language, setLanguage] = useState("javascript");

  const onSelect = (language) => {
    setLanguage(language);
    setValue(CODE_SNIPPETS[language]);
  };

  const ydocument = new Y.Doc();
  const provider = new WebsocketProvider(
    `${location.protocol === "http:" ? "ws:" : "wss:"}//localhost:1234`,
    "monaco",
    ydocument
  );
  const type = ydocument.getText("monaco");
  const onMount = (editor: any) => {
    editorRef.current = editor;
    editor.focus();
    const monacoBinding = new MonacoBinding(
      type,
      editor.getModel(),
      new Set([editor]),
      provider.awareness
    );
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
            <Editor
              options={{
                minimap: {
                  enabled: false,
                },
              }}
              height="75vh"
              theme="vs-dark"
              language={language}
              defaultValue={CODE_SNIPPETS[language]}
              onMount={onMount}
              value={value}
              onChange={(value) => setValue(value)}
            />
          </Box>
        </Box>
        <Output editorRef={editorRef} language={language} />
      </HStack>
    </Box>
  );
};
export default CodeEditor;
