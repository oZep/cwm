import { Box, Text } from "@chakra-ui/react";
import { marked } from "marked";
import "./QuestionBox.css";

interface QuestionBoxProps {
  question: string;
}

const QuestionBox = ({ question }: QuestionBoxProps) => {
  return (
    <div>
      <Box
        p={8}
        borderWidth={1}
        borderRadius="md"
        bg="blackAlpha.300"
        borderColor="pink.100"
        mx={10}
        my={4}
      >
        <Text color="white">
          <span dangerouslySetInnerHTML={{ __html: marked(question) }} />
        </Text>
      </Box>
    </div>
  );
};

export default QuestionBox;
