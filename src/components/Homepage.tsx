'use client'

import {
  Flex,
  Container,
  Heading,
  Stack,
  Text,
  Button,
  Box
} from '@chakra-ui/react'

import { Illustration } from './Illustration'

export default function CallToActionWithIllustration() {
  return (
    <Box background={"purple.900"} minHeight="100vh" py={4}>
    <Container maxW={'5xl'}>
      <Stack
        textAlign={'center'}
        align={'center'}
        spacing={{ base: 8, md: 10 }}
        py={{ base: 20, md: 28 }}>
        <Heading
          fontWeight={600}
          fontSize={{ base: '3xl', sm: '4xl', md: '6xl' }}
          lineHeight={'110%'}>
          Code With Me{' '}
          <Text as={'span'} color={'pink.400'}>
            made easy
          </Text>
        </Heading>
        <Text color={'white'} maxW={'3xl'}>
          Never miss a meeting. Never be late for one too. Keep track of your meetings and
          receive smart reminders in appropriate times. Read your smart “Daily Agenda”
          every morning.
        </Text>
        <Stack spacing={6} direction={'row'}>
          <Button
            rounded={'full'}
            px={6}
            colorScheme={'pink'}
            bg={'pink.400'}
            _hover={{ bg: 'pink.500' }}>
            <a href="/editor">Get Started</a>
          </Button>
        </Stack>
        <Flex w={'full'}>
          <Illustration height={{ sm: '24rem', lg: '28rem' }} mt={{ base: 12, sm: 16 }} />
        </Flex>
      </Stack>
      <Heading
        fontWeight={600}
        fontSize={{ base: '3xl', sm: '4xl', md: '6xl' }}
        lineHeight={'110%'}
      >
        Mission Statement
      </Heading>
      <p></p>
    </Container>
    </Box>
  )
}