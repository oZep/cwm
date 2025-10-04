'use client'

import {
  Container,
  Heading,
  Stack,
  Text,
  Button,
  Box,
  Image,
  SimpleGrid,
  Card,
  CardBody,
  Avatar,
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
          lineHeight={'110%'}>Code With Me{' '}
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
          <Image src="/girl.png" alt="Illustration" />
      </Stack>

      <Box py={16}>
        <Heading
        fontWeight={600}
        fontSize={{ base: '3xl', sm: '4xl', md: '6xl' }}
        lineHeight={'110%'}
        textAlign={'center'}
        mb={12}
      >
          Our Mission
      </Heading>
        <Text color={'white'} maxW={'3xl'} mx={'auto'} textAlign={'center'} mb={16}>
          Using the one-on-one community experience to encourage others to learn how to code
        </Text>

        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={8} mt={12}>
          <Card bg={'purple.800'} borderRadius={'lg'} p={6}>
            <CardBody display="flex" flexDirection="column" justifyContent="space-between" height="100%">
              <Text color={'white'} mb={4} fontStyle="italic">
                "This experience made me feel confident about my coding experience"
              </Text>
              <Stack direction={'row'} alignItems={'center'}>
                <Avatar src="/user1.jpg" name="Alex Johnson" />
                <Text color={'white'} fontWeight={500}>Alex Johnson</Text>
              </Stack>
            </CardBody>
          </Card>

          <Card bg={'purple.800'} borderRadius={'lg'} p={6}>
            <CardBody display="flex" flexDirection="column" justifyContent="space-between" height="100%">
              <Text color={'white'} mb={4} fontStyle="italic">
                "The mentorship program helped me land my first developer job"
              </Text>
              <Stack direction={'row'} alignItems={'center'}>
                <Avatar src="/user2.jpg" name="Maria Garcia" />
                <Text color={'white'} fontWeight={500}>Maria Garcia</Text>
              </Stack>
            </CardBody>
          </Card>

          <Card bg={'purple.800'} borderRadius={'lg'} p={6} height="100%">
            <CardBody display="flex" flexDirection="column" justifyContent="space-between" height="100%">
              <Text color={'white'} mb={4} fontStyle="italic">
                "I went from zero to building full applications in 6 months"
              </Text>
              <Stack direction={'row'} alignItems={'center'}>
                <Avatar src="/user3.jpg" name="Sam Chen" />
                <Text color={'white'} fontWeight={500}>Sam Chen</Text>
              </Stack>
            </CardBody>
          </Card>
        </SimpleGrid>
    </Box>
    </Container>
    </Box>
  )
}