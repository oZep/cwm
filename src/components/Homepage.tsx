'use client';

import React, { useMemo, useState } from 'react';
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
  useToast,
} from '@chakra-ui/react';
import { FaQuoteLeft, FaHeart } from 'react-icons/fa';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useSignalWS } from '../context/SignalWSProvider';

// Motion-enabled components
const MotionBox = motion(Box);
const MotionCard = motion(Card);
const MotionImage = motion(Image);
const MotionHeading = motion(Heading);
const MotionText = motion(Text);

export default function HomePage() {
  const { scrollYProgress } = useScroll();
  const background = useTransform(scrollYProgress, [0, 0.5, 1], ['#322659', '#2C244A', '#171923']);

  // Hearts animation positions are stable across renders
  const floatingHearts = useMemo(
    () =>
      Array.from({ length: 15 }).map((_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        animationDelay: Math.random() * 5,
        duration: 3 + Math.random() * 4,
      })),
    []
  );

  const { send, on, status } = useSignalWS();
  const navigate = useNavigate();
  const toast = useToast();
  const [waiting, setWaiting] = useState(false);

  const handleGetStarted = () => {
    if (waiting) return;

    if (status !== 'open') {
      toast({
        status: 'warning',
        title: 'Connecting...',
        description: 'Please wait a moment, then try again.',
        duration: 2000,
      });
      return;
    }

    const offWaiting = on('WAITING', () => {
      setWaiting(true);
      toast({
        status: 'info',
        title: 'Searching for a partner...',
        duration: 1500,
      });
    });

    const offReady = on('ROOM_READY', (msg: any) => {
      offWaiting();
      offReady();
      setWaiting(false);
      navigate(`/editor?roomId=${msg.roomId}`);
    });

    const ok = send({ type: 'JOIN' });
    if (!ok) {
      offWaiting();
      offReady();
      toast({ status: 'error', title: 'WebSocket not ready' });
    }
  };

  return (
    <MotionBox
      style={{ background }}
      color="white"
      minHeight="100vh"
      py={4}
      position="relative"
      overflow="hidden"
    >
      {/* Floating hearts background */}
      {floatingHearts.map((heart) => (
        <MotionBox
          key={heart.id}
          position="absolute"
          left={heart.left}
          bottom="-50px"
          initial={{ y: 0, opacity: 0 }}
          animate={{
            y: -1000,
            opacity: [0, 0.6, 0],
            x: [0, Math.random() * 100 - 50, Math.random() * 100 - 50],
          }}
          transition={{
            duration: heart.duration,
            repeat: Infinity,
            delay: heart.animationDelay,
            ease: 'easeInOut',
          }}
        >
          <Icon as={FaHeart} color="pink.300" opacity={0.3} fontSize="xl" />
        </MotionBox>
      ))}

      <Container maxW="5xl" position="relative" zIndex={1}>
        <Stack
          textAlign="center"
          align="center"
          spacing={{ base: 8, md: 10 }}
          py={{ base: 20, md: 28 }}
        >
          {/* Title */}
          <MotionHeading
            fontWeight={600}
            fontSize={{ base: '3xl', sm: '4xl', md: '6xl' }}
            lineHeight="110%"
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            Code With{' '}
            <MotionText
              as="span"
              bgGradient="linear(to-r, pink.400, purple.300, pink.400)"
              bgClip="text"
              backgroundSize="200% auto"
              animate={{ backgroundPosition: ['0% center', '200% center', '0% center'] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            >
              Me
            </MotionText>
          </MotionHeading>

          <MotionText
            as="em"
            display="inline"
            fontSize={{ base: 'lg', sm: 'xl' }}
            color="gray.300"
            mb={1}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            Stop struggling alone.
          </MotionText>

          <MotionText
            maxW="3xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            <Text color="gray.300" fontSize={{ base: 'lg', sm: 'xl' }}>
              Code With Me instantly connects you with{' '}
              <Text as="span" fontWeight="bold" color="pink.400">
                mentors, peers, and fellow developers
              </Text>{' '}
              so you can write, review, and learn together. Instantly share your environment, debug
              together, and turn code reviews into a{' '}
              <Text as="span" fontWeight="bold" color="pink.400">
                fluid, real-time conversation.
              </Text>
            </Text>
          </MotionText>

          <Stack spacing={6} direction="row">
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.5 }}
            >
              <Button
                rounded="full"
                px={6}
                colorScheme="pink"
                bg="pink.400"
                _hover={{ bg: 'pink.500', boxShadow: '0 0 30px rgba(237, 100, 166, 0.6)' }}
                position="relative"
                overflow="hidden"
                transition="all 0.3s"
                onClick={handleGetStarted}
                isLoading={waiting}
                loadingText="Finding a partner..."
              >
                <MotionBox
                  position="absolute"
                  top="50%"
                  left="50%"
                  width="0"
                  height="0"
                  borderRadius="50%"
                  bg="whiteAlpha.300"
                  whileHover={{
                    width: '300px',
                    height: '300px',
                    x: '-50%',
                    y: '-50%',
                  }}
                  transition={{ duration: 0.6 }}
                />
                <Text position="relative" zIndex={1}>Get Started</Text>
              </Button>
            </motion.div>
          </Stack>

          {/* Illustration */}
          <MotionImage
            src="/girl.png"
            alt="Illustration"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.9, duration: 0.8 }}
            whileHover={{
              scale: 1.05,
              rotate: [0, -2, 2, -2, 0],
              transition: { duration: 0.5 },
            }}
            style={{ cursor: 'pointer' }}
          />
        </Stack>

        {/* Mission Section */}
        <Box py={16}>
          <Stack spacing={4} as={Container} maxW="3xl" textAlign="center">
            <MotionHeading
              fontSize={{ base: '3xl', sm: '4xl', md: '5xl' }}
              fontWeight={700}
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              Our Mission
            </MotionHeading>
            <MotionText
              color="gray.300"
              fontSize={{ base: 'lg', sm: 'xl' }}
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              To democratize coding education by fostering a{' '}
              <Text as="span" fontWeight="bold" color="pink.400">
                supportive, one-on-one community
              </Text>{' '}
              where anyone can learn, grow, and build the future, together. We believe the best way
              to learn is by{' '}
              <Text as="span" fontWeight="bold" color="pink.400">
                doing
              </Text>
              —and the best way to do it is with a{' '}
              <Text as="span" fontWeight="bold" color="pink.400">
                mentor by your side.
              </Text>
            </MotionText>
          </Stack>

          {/* Testimonials */}
          <Container maxW="5xl" mt={20}>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={10}>
              {[
                {
                  quote: '"This experience made me feel ',
                  highlight: 'confident about my coding skills',
                  quote2: ' for the first time."',
                  name: 'Alex Johnson',
                  avatar: '/user1.jpg',
                },
                {
                  quote: '"The mentorship program was a ',
                  highlight: 'game-changer.',
                  quote2: ' It directly helped me ',
                  highlight2: 'land my first developer job.',
                  quote3: '"',
                  name: 'Maria Garcia',
                  avatar: '/user2.jpg',
                },
                {
                  quote: '"I went from ',
                  highlight: 'zero to building full-stack applications',
                  quote2: ' in just 6 months. ',
                  highlight2: 'Unbelievable.',
                  quote3: '"',
                  name: 'Sam Chen',
                  avatar: '/user3.jpg',
                },
              ].map((testimonial, index) => (
                <MotionCard
                  key={index}
                  bg="purple.800"
                  borderRadius="xl"
                  height="100%"
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.2 }}
                  whileHover={{
                    scale: 1.05,
                    boxShadow: '0 20px 60px rgba(237, 100, 166, 0.4)',
                    y: -10,
                  }}
                  position="relative"
                  overflow="hidden"
                  _before={{
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: '-100%',
                    width: '100%',
                    height: '100%',
                    background:
                      'linear-gradient(90deg, transparent, rgba(237, 100, 166, 0.2), transparent)',
                    transition: 'left 0.5s',
                  }}
                  _hover={{
                    _before: {
                      left: '100%',
                    },
                  }}
                >
                  <CardBody
                    display="flex"
                    flexDirection="column"
                    justifyContent="space-between"
                    p={8}
                  >
                    <Box>
                      <motion.div
                        animate={{ rotate: [0, -10, 10, -10, 0], scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                      >
                        <Icon as={FaQuoteLeft} w={10} h={10} color="pink.400" mb={6} />
                      </motion.div>
                      <Text
                        fontWeight={500}
                        fontSize="xl"
                        fontStyle="italic"
                        lineHeight="1.7"
                        mb={8}
                      >
                        {testimonial.quote}
                        <Text as="span" fontWeight="bold">
                          {testimonial.highlight}
                        </Text>
                        {testimonial.quote2}
                        {testimonial.highlight2 && (
                          <Text as="span" fontWeight="bold">
                            {testimonial.highlight2}
                          </Text>
                        )}
                        {testimonial.quote3}
                      </Text>
                    </Box>
                    <motion.div whileHover={{ x: 10 }} transition={{ type: 'spring', stiffness: 300 }}>
                      <Stack direction="row" spacing={4} alignItems="center">
                        <motion.div whileHover={{ scale: 1.2, rotate: 360 }} transition={{ duration: 0.5 }}>
                          <Avatar src={testimonial.avatar} name={testimonial.name} />
                        </motion.div>
                        <Text fontWeight={600}>{testimonial.name}</Text>
                      </Stack>
                    </motion.div>
                  </CardBody>
                </MotionCard>
              ))}
            </SimpleGrid>
          </Container>
        </Box>
      </Container>
    </MotionBox>
  );
}