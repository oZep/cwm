import { useState } from "react";
import { Box, Button, Text, useToast } from "@chakra-ui/react";
import { executeCode } from "../api";

interface OutputProps {
  editorRef: React.RefObject<{ getValue: () => string }>;
  language: string;
}

const Output = ({ editorRef, language }: OutputProps) => {
  const toast = useToast();
  const [output, setOutput] = useState<string[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  const runCode = async () => {
    const sourceCode = editorRef.current?.getValue();
    if (!sourceCode) return;
    try {
      setIsLoading(true);
      const { run: result } = await executeCode(language, sourceCode);
      setOutput(result.output.split("\n"));
      result.stderr ? setIsError(true) : setIsError(false);
    } catch (error) {
      console.log(error);
      toast({
        title: "An error occurred.",
        description:
          typeof error === "object" && error !== null && "message" in error
            ? String((error as { message?: string }).message)
            : "Unable to run code",
        status: "error",
        duration: 6000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box w="50%">
      <Box display="flex" justifyContent="space-between" mb={4}>
        <Button
          variant="outline"
          colorScheme="green"
          isLoading={isLoading}
          onClick={runCode}
          background={"green.900"}
          _hover={{ background: "green.600" }}
        >
          Run Code
        </Button>
        <Button
          variant="outline"
          colorScheme="grey"
          as={'a'}
          href="/"
          color={"gray.300"}
          background={"gray.900"}
          _hover={{ background: "gray.600" }}
          border={"1px solid"}
          borderColor={"gray.400"}
        >
          Exit
        </Button>
      </Box>
      <Box
        height="75vh"
        p={2}
        color={isError ? "red.400" : ""}
        border="1px solid"
        borderRadius={4}
        borderColor={isError ? "red.500" : "pink.100"}
        background={"blackAlpha.400"}
      >
        {output
          ? output.map((line, i) => <Text key={i}>{line}</Text>)
          : 'Click "Run Code" to see the output here'}
      </Box>
    </Box>
  );
};
export default Output;
