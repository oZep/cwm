import {
  Box,
  Button,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Text,
} from "@chakra-ui/react";
import { LANGUAGE_VERSIONS } from "../constants";

const languages = Object.entries(LANGUAGE_VERSIONS);
const ACTIVE_COLOR = "purple.200";

const LanguageSelector = ({ language, onSelect }) => {
  return (
    <Box mb={4}>
      <Menu isLazy>
        <MenuButton as={Button} borderColor={"blue.100"} color={"blue.100"} backgroundColor={"blue.900"} _hover={{ background: "blue.600" }} borderWidth={1}>{language}</MenuButton>
        <MenuList bg="purple.900">
          {languages.map(([lang, version]) => (
            <MenuItem
              key={lang}
              color={lang === language ? ACTIVE_COLOR : ""}
              bg={lang === language ?"pink.500" : "transparent"}
              _hover={{
                color: ACTIVE_COLOR,
                bg: "pink.900",
              }}
              onClick={() => onSelect(lang)}
            >
              {lang}
              &nbsp;
              <Text as="span" color="pink.600" fontSize="sm">
                ({version})
              </Text>
            </MenuItem>
          ))}
        </MenuList>
      </Menu>
    </Box>
  );
};
export default LanguageSelector;
