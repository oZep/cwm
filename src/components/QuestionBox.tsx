import { Box, Text } from "@chakra-ui/react";
interface QuestionBoxProps {
    question: string;
}

const QuestionBox = ({ question }: QuestionBoxProps) => {
    return (
        <Box p={4} borderWidth={1} borderRadius="md" bg="blackAlpha.300" borderColor="pink.100" mx={10} my={4}>
            <Text fontWeight="bold">Question:</Text>
            <Text>
                {question}
            </Text>
        </Box>
    );
};

export default QuestionBox; 