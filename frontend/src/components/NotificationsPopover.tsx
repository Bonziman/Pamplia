// src/components/NotificationsPopover.tsx
// Notification bell with popover panel — Apple-inspired

import React, { useState, useEffect, useCallback } from 'react';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverBody,
  IconButton,
  Box,
  Flex,
  Text,
  Badge,
  VStack,
  Button,
  Icon,
} from '@chakra-ui/react';
import {
  Bell,
  Calendar,
  Inbox,
} from 'lucide-react';
import { fetchAppointments, FetchedAppointment } from '../api/appointmentApi';

interface NotificationItem {
  id: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
  time: string;
  isRead: boolean;
}

const NotificationsPopover: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  // Generate notifications from upcoming appointments
  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const appointments = await fetchAppointments();
      const now = new Date();
      const upcoming = appointments
        .filter((apt: FetchedAppointment) => {
          const aptDate = new Date(apt.appointment_time);
          const diffMs = aptDate.getTime() - now.getTime();
          const diffHours = diffMs / (1000 * 60 * 60);
          return diffHours > 0 && diffHours <= 48; // Next 48 hours
        })
        .sort((a: FetchedAppointment, b: FetchedAppointment) =>
          new Date(a.appointment_time).getTime() - new Date(b.appointment_time).getTime()
        )
        .slice(0, 5);

      const items: NotificationItem[] = upcoming.map((apt: FetchedAppointment, i: number) => {
        const aptDate = new Date(apt.appointment_time);
        const diffMs = aptDate.getTime() - now.getTime();
        const diffHours = Math.round(diffMs / (1000 * 60 * 60));

        let timeLabel: string;
        if (diffHours < 1) {
          const diffMins = Math.round(diffMs / (1000 * 60));
          timeLabel = `in ${diffMins}m`;
        } else if (diffHours < 24) {
          timeLabel = `in ${diffHours}h`;
        } else {
          timeLabel = 'Tomorrow';
        }

        const serviceName = apt.services?.length
          ? apt.services[0].name
          : 'Appointment';

        return {
          id: `apt-${apt.id}`,
          icon: Calendar,
          iconColor: 'brand.600',
          iconBg: 'brand.50',
          title: `Upcoming: ${serviceName}`,
          description: `${apt.client_name || 'Client'} — ${aptDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
          time: timeLabel,
          isRead: i > 1, // First 2 are "unread"
        };
      });

      setNotifications(items);
      setHasUnread(items.some((n) => !n.isRead));
    } catch {
      // Silently fail — notifications are non-critical
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setHasUnread(false);
  };

  return (
    <Popover
      placement="bottom-end"
      gutter={12}
      onOpen={loadNotifications}
      isLazy
    >
      <PopoverTrigger>
        <IconButton
          aria-label="Notifications"
          icon={
            <Box position="relative">
              <Bell size={19} />
              {hasUnread && (
                <Badge
                  position="absolute"
                  top="-1px"
                  right="-1px"
                  w="8px"
                  h="8px"
                  p="0"
                  minW="unset"
                  borderRadius="full"
                  bg="red.500"
                  border="2px solid white"
                />
              )}
            </Box>
          }
          variant="ghost"
          color="gray.500"
          _hover={{ color: 'gray.700', bg: 'gray.100' }}
          size="sm"
          borderRadius="lg"
        />
      </PopoverTrigger>

      <PopoverContent
        w="360px"
        borderRadius="xl"
        border="1px solid"
        borderColor="gray.200"
        shadow="lg"
        _focus={{ outline: 'none' }}
      >
        <PopoverHeader
          px={4}
          py={3}
          borderBottom="1px solid"
          borderColor="gray.100"
          display="flex"
          alignItems="center"
          justifyContent="space-between"
        >
          <Text fontSize="sm" fontWeight="700" color="gray.900" mb={0}>
            Notifications
          </Text>
          {hasUnread && (
            <Button
              variant="ghost"
              size="xs"
              color="brand.500"
              fontWeight="600"
              _hover={{ bg: 'brand.50' }}
              onClick={markAllRead}
            >
              Mark all read
            </Button>
          )}
        </PopoverHeader>

        <PopoverBody p={0} maxH="320px" overflowY="auto">
          {isLoading ? (
            <Flex align="center" justify="center" py={8}>
              <Text fontSize="sm" color="gray.400" mb={0}>
                Loading...
              </Text>
            </Flex>
          ) : notifications.length === 0 ? (
            <VStack py={10} spacing={3}>
              <Flex
                w="48px"
                h="48px"
                align="center"
                justify="center"
                borderRadius="full"
                bg="gray.50"
              >
                <Icon as={Inbox} w={5} h={5} color="gray.300" />
              </Flex>
              <Text fontSize="sm" color="gray.400" mb={0}>
                You're all caught up
              </Text>
            </VStack>
          ) : (
            <VStack spacing={0} align="stretch">
              {notifications.map((notification) => (
                <Flex
                  key={notification.id}
                  px={4}
                  py={3}
                  gap={3}
                  align="flex-start"
                  bg={notification.isRead ? 'transparent' : 'brand.50'}
                  borderBottom="1px solid"
                  borderColor="gray.50"
                  transition="background 0.15s ease"
                  _hover={{ bg: notification.isRead ? 'gray.50' : 'brand.50' }}
                  cursor="default"
                >
                  <Flex
                    w="32px"
                    h="32px"
                    align="center"
                    justify="center"
                    borderRadius="lg"
                    bg={notification.iconBg}
                    flexShrink={0}
                    mt="1px"
                  >
                    <Icon
                      as={notification.icon}
                      w={4}
                      h={4}
                      color={notification.iconColor}
                    />
                  </Flex>
                  <Box flex={1} minW={0}>
                    <Text
                      fontSize="sm"
                      fontWeight={notification.isRead ? '500' : '600'}
                      color="gray.800"
                      mb={0}
                      noOfLines={1}
                    >
                      {notification.title}
                    </Text>
                    <Text fontSize="xs" color="gray.500" mb={0} noOfLines={1}>
                      {notification.description}
                    </Text>
                  </Box>
                  <Text
                    fontSize="2xs"
                    color="gray.400"
                    flexShrink={0}
                    mt="2px"
                    mb={0}
                  >
                    {notification.time}
                  </Text>
                </Flex>
              ))}
            </VStack>
          )}
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationsPopover;
