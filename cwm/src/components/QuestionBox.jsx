import { Box, Text } from "@chakra-ui/react";
const QuestionBox = ({ question }) => {
    return (
        <Box p={4} borderWidth={1} borderRadius="md" bg="blackAlpha.200" mx={10} my={4}>
            <Text fontWeight="bold">Question:</Text>
            <Text>
                {question}
            </Text>
        </Box>
    );
};

export default QuestionBox; 