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
  Icon,
} from '@chakra-ui/react'
import { FaQuoteLeft } from 'react-icons/fa'
// --- FANCY ANIMATION IMPORTS ---
import { motion, useScroll, useTransform } from 'framer-motion'

// Create a motion-enabled Box component
const MotionBox = motion(Box)

export default function CallToActionWithIllustration() {
  // --- FANCY ANIMATION HOOKS ---
  // 1. useScroll tracks the scroll progress of the page (from 0 at the top to 1 at the bottom)
  const { scrollYProgress } = useScroll()

  // 2. useTransform maps the scroll progress to a range of colors.
  // As scrollYProgress goes from 0 to 1, the background will transition
  // from purple.900 -> a darker purple -> to an almost-black gray.900
  const background = useTransform(
    scrollYProgress,
    [0, 0.5, 1],
    ['#322659', '#2C244A', '#171923'], // Hex codes for purple.900, a mid-purple, and gray.900
  )

  return (
    // We use MotionBox here and apply the animated background via the style prop
    <MotionBox style={{ background }} color={'white'} minHeight="100vh" py={4}>
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
          <Text maxW={'3xl'}>
            Never miss a meeting. Never be late for one too. Keep track of your meetings and receive
            smart reminders in appropriate times. Read your smart “Daily Agenda” every morning.
          </Text>
          <Stack spacing={6} direction={'row'}>
            <Button
              as={'a'}
              href="/editor"
              rounded={'full'}
              px={6}
              colorScheme={'pink'}
              bg={'pink.400'}
              _hover={{ bg: 'pink.500' }}>
              Get Started
            </Button>
          </Stack>
          <Image src="/girl.png" alt="Illustration" />
        </Stack>

        <Box py={16}>
          <Stack spacing={4} as={Container} maxW={'3xl'} textAlign={'center'}>
            <Heading fontSize={{ base: '3xl', sm: '4xl', md: '5xl' }} fontWeight={700}>
              Our Mission
            </Heading>
            <Text color={'gray.300'} fontSize={{ base: 'lg', sm: 'xl' }}>
              To democratize coding education by fostering a{' '}
              <Text as="span" fontWeight="bold" color="pink.400">
                supportive, one-on-one community
              </Text>{' '}
              where anyone can learn, grow, and build the future, together. We believe the best
              way to learn is by{' '}
              <Text as="span" fontWeight="bold" color="pink.400">
                doing
              </Text>
              —and the best way to do it is with a{' '}
              <Text as="span" fontWeight="bold" color="pink.400">
                mentor by your side.
              </Text>
            </Text>
          </Stack>

          <Container maxW={'5xl'} mt={20}>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={10}>
              <Card bg={'purple.800'} borderRadius={'xl'} height="100%">
                <CardBody
                  display="flex"
                  flexDirection="column"
                  justifyContent="space-between"
                  p={8}>
                  <Box>
                    <Icon as={FaQuoteLeft} w={10} h={10} color={'pink.400'} mb={6} />
                    <Text
                      fontWeight={500}
                      fontSize={'xl'}
                      fontStyle="italic"
                      lineHeight="1.7"
                      mb={8}>
                      "This experience made me feel{' '}
                      <Text as="span" fontWeight="bold">
                        confident about my coding skills
                      </Text>{' '}
                      for the first time."
                    </Text>
                  </Box>
                  <Stack direction={'row'} spacing={4} alignItems={'center'}>
                    <Avatar src="/user1.jpg" name="Alex Johnson" />
                    <Text fontWeight={600}>Alex Johnson</Text>
                  </Stack>
                </CardBody>
              </Card>

              <Card bg={'purple.800'} borderRadius={'xl'} height="100%">
                <CardBody
                  display="flex"
                  flexDirection="column"
                  justifyContent="space-between"
                  p={8}>
                  <Box>
                    <Icon as={FaQuoteLeft} w={10} h={10} color={'pink.400'} mb={6} />
                    <Text
                      fontWeight={500}
                      fontSize={'xl'}
                      fontStyle="italic"
                      lineHeight="1.7"
                      mb={8}>
                      "The mentorship program was a{' '}
                      <Text as="span" fontWeight="bold">
                        game-changer.
                      </Text>{' '}
                      It directly helped me{' '}
                      <Text as="span" fontWeight="bold">
                        land my first developer job.
                      </Text>
                      "
                    </Text>
                  </Box>
                  <Stack direction={'row'} spacing={4} alignItems={'center'}>
                    <Avatar src="/user2.jpg" name="Maria Garcia" />
                    <Text fontWeight={600}>Maria Garcia</Text>
                  </Stack>
                </CardBody>
              </Card>

              <Card bg={'purple.800'} borderRadius={'xl'} height="100%">
                <CardBody
                  display="flex"
                  flexDirection="column"
                  justifyContent="space-between"
                  p={8}>
                  <Box>
                    <Icon as={FaQuoteLeft} w={10} h={10} color={'pink.400'} mb={6} />
                    <Text
                      fontWeight={500}
                      fontSize={'xl'}
                      fontStyle="italic"
                      lineHeight="1.7"
                      mb={8}>
                      "I went from{' '}
                      <Text as="span" fontWeight="bold">
                        zero to building full-stack applications
                      </Text>{' '}
                      in just 6 months.{' '}
                      <Text as="span" fontWeight="bold">
                        Unbelievable.
                      </Text>
                      "
                    </Text>
                  </Box>
                  <Stack direction={'row'} spacing={4} alignItems={'center'}>
                    <Avatar src="/user3.jpg" name="Sam Chen" />
                    <Text fontWeight={600}>Sam Chen</Text>
                  </Stack>
                </CardBody>
              </Card>
            </SimpleGrid>
          </Container>
        </Box>
      </Container>
    </MotionBox>
  )
}