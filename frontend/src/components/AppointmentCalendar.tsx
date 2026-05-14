import React, { useMemo, useState } from 'react';
import { FetchedAppointment } from '../api/appointmentApi';
import {
  Box,
  Flex,
  Icon,
  IconButton,
  Text,
  HStack,
  VStack,
  Badge,
  Button,
  SimpleGrid,
  Divider,
  Input,
  InputGroup,
  InputLeftElement,
} from '@chakra-ui/react';
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Clock,
  Plus,
  User,
  Scissors,
  Search,
} from 'lucide-react';

interface AppointmentCalendarProps {
  appointments: FetchedAppointment[];
  onAppointmentClick?: (appointment: FetchedAppointment) => void;
  onDayClick?: (date: Date) => void;
}

type StatusKey = 'pending' | 'confirmed' | 'cancelled' | 'done';

const getLanguage = (): 'en' | 'fr' => (localStorage.getItem('pamplia.language') === 'fr' ? 'fr' : 'en');
const getUiLocale = (): string => (getLanguage() === 'fr' ? 'fr-FR' : 'en-US');

const statusMeta: Record<StatusKey, { labelFr: string; labelEn: string; colorScheme: string; borderColor: string; bg: string; textColor: string }> = {
  pending: {
    labelFr: 'En attente',
    labelEn: 'Pending',
    colorScheme: 'yellow',
    borderColor: 'yellow.200',
    bg: 'yellow.50',
    textColor: 'yellow.800',
  },
  confirmed: {
    labelFr: 'Confirme',
    labelEn: 'Confirmed',
    colorScheme: 'green',
    borderColor: 'green.200',
    bg: 'green.50',
    textColor: 'green.800',
  },
  cancelled: {
    labelFr: 'Annule',
    labelEn: 'Cancelled',
    colorScheme: 'red',
    borderColor: 'red.200',
    bg: 'red.50',
    textColor: 'red.800',
  },
  done: {
    labelFr: 'Termine',
    labelEn: 'Done',
    colorScheme: 'gray',
    borderColor: 'gray.200',
    bg: 'gray.50',
    textColor: 'gray.700',
  },
};

const normalizeStatus = (status: string): StatusKey => {
  const normalized = status.toLowerCase();
  if (normalized === 'completed' || normalized === 'done') return 'done';
  if (normalized === 'canceled' || normalized === 'cancelled') return 'cancelled';
  if (normalized === 'confirmed') return 'confirmed';
  return 'pending';
};

const toDayKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const fromDayKey = (key: string): Date => {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const addDays = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const isSameDay = (left: Date, right: Date): boolean =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

const getStartOfWeek = (date: Date): Date => {
  const start = new Date(date);
  const day = start.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diffToMonday);
  start.setHours(0, 0, 0, 0);
  return start;
};

const getMonthGridStart = (date: Date): Date => {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const day = first.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  return addDays(first, diffToMonday);
};

const formatRangeLabel = (start: Date, end: Date): string => {
  const locale = getUiLocale();
  const startLabel = start.toLocaleDateString(locale, { day: 'numeric', month: 'long' });
  const endLabel = end.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
  return `${startLabel} - ${endLabel}`;
};

const formatTime = (dateString: string): string => {
  try {
    return new Date(dateString).toLocaleTimeString(getUiLocale(), {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return '--:--';
  }
};

const formatDayShort = (date: Date): string =>
  date.toLocaleDateString(getUiLocale(), { weekday: 'short' }).replace('.', '').toUpperCase();

const AppointmentCalendar = ({
  appointments,
  onAppointmentClick,
  onDayClick,
}: AppointmentCalendarProps) => {
  const isFr = getLanguage() === 'fr';
  const uiLocale = getUiLocale();
  const allStatuses = useMemo<StatusKey[]>(() => Object.keys(statusMeta) as StatusKey[], []);
  const [anchorDate, setAnchorDate] = useState<Date>(new Date());
  const [selectedDayKey, setSelectedDayKey] = useState<string>(toDayKey(new Date()));
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [visibleStatuses, setVisibleStatuses] = useState<StatusKey[]>(['pending', 'confirmed', 'cancelled', 'done']);

  const weekStart = useMemo<Date>(() => getStartOfWeek(anchorDate), [anchorDate]);
  const weekDays = useMemo<Date[]>(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart]
  );
  const weekEnd = weekDays[6];

  const selectedDay = useMemo<Date>(() => {
    const parsed = fromDayKey(selectedDayKey);
    const inCurrentWeek = weekDays.some((day: Date) => isSameDay(day, parsed));
    if (inCurrentWeek) return parsed;
    const today = new Date();
    const todayInWeek = weekDays.find((day: Date) => isSameDay(day, today));
    return todayInWeek || weekDays[0];
  }, [selectedDayKey, weekDays]);

  const appointmentsInWeek = useMemo<FetchedAppointment[]>(() => {
    const start = weekStart.getTime();
    const end = addDays(weekEnd, 1).getTime();

    return appointments
      .filter((appointment: FetchedAppointment) => {
        const value = new Date(appointment.appointment_time).getTime();
        return value >= start && value < end;
      })
      .sort(
        (left: FetchedAppointment, right: FetchedAppointment) =>
          new Date(left.appointment_time).getTime() - new Date(right.appointment_time).getTime()
      );
  }, [appointments, weekStart, weekEnd]);

  const statusCounts = useMemo<Record<StatusKey, number>>(() => {
    const counters: Record<StatusKey, number> = {
      pending: 0,
      confirmed: 0,
      cancelled: 0,
      done: 0,
    };

    appointmentsInWeek.forEach((appointment: FetchedAppointment) => {
      const status = normalizeStatus(appointment.status);
      counters[status] += 1;
    });

    return counters;
  }, [appointmentsInWeek]);

  const filteredAppointments = useMemo<FetchedAppointment[]>(() => {
    const term = searchTerm.trim().toLowerCase();

    return appointmentsInWeek.filter((appointment: FetchedAppointment) => {
      const status = normalizeStatus(appointment.status);
      if (!visibleStatuses.includes(status)) return false;

      if (!term) return true;

      const services = appointment.services?.map((service) => service.name.toLowerCase()).join(' ') || '';
      const haystack = `${appointment.client_name} ${appointment.client_email} ${services}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [appointmentsInWeek, searchTerm, visibleStatuses]);

  const appointmentsByDay = useMemo<Record<string, FetchedAppointment[]>>(() => {
    const grouped: Record<string, FetchedAppointment[]> = {};

    weekDays.forEach((day: Date) => {
      grouped[toDayKey(day)] = [];
    });

    filteredAppointments.forEach((appointment: FetchedAppointment) => {
      const dayKey = toDayKey(new Date(appointment.appointment_time));
      if (!grouped[dayKey]) grouped[dayKey] = [];
      grouped[dayKey].push(appointment);
    });

    Object.values(grouped).forEach((list: FetchedAppointment[]) => {
      list.sort(
        (left: FetchedAppointment, right: FetchedAppointment) =>
          new Date(left.appointment_time).getTime() - new Date(right.appointment_time).getTime()
      );
    });

    return grouped;
  }, [filteredAppointments, weekDays]);

  const selectedDayAppointments = appointmentsByDay[toDayKey(selectedDay)] || [];
  const hasStatusFilter = visibleStatuses.length !== allStatuses.length;
  const hasSearchTerm = searchTerm.trim().length > 0;
  const hasActiveFilters = hasStatusFilter || hasSearchTerm;

  const miniMonthStart = useMemo<Date>(() => getMonthGridStart(anchorDate), [anchorDate]);
  const miniMonthDays = useMemo<Date[]>(
    () => Array.from({ length: 42 }, (_, index) => addDays(miniMonthStart, index)),
    [miniMonthStart]
  );

  const goPreviousWeek = (): void => {
    setAnchorDate((current: Date) => addDays(current, -7));
  };

  const goNextWeek = (): void => {
    setAnchorDate((current: Date) => addDays(current, 7));
  };

  const goToday = (): void => {
    const today = new Date();
    setAnchorDate(today);
    setSelectedDayKey(toDayKey(today));
  };

  const moveMiniMonth = (monthsDelta: number): void => {
    setAnchorDate((current: Date) => new Date(current.getFullYear(), current.getMonth() + monthsDelta, 1));
  };

  const selectDay = (date: Date): void => {
    setSelectedDayKey(toDayKey(date));
    setAnchorDate(date);
  };

  const toggleStatus = (status: StatusKey): void => {
    setVisibleStatuses((current: StatusKey[]) => {
      if (current.includes(status)) {
        if (current.length === 1) return current;
        return current.filter((item: StatusKey) => item !== status);
      }
      return [...current, status];
    });
  };

  const resetFilters = (): void => {
    setSearchTerm('');
    setVisibleStatuses(allStatuses);
  };

  return (
    <Flex gap={5} align="stretch" direction={{ base: 'column', '2xl': 'row' }}>
      <Box
        display={{ base: 'none', xl: 'block' }}
        w="260px"
        bg="white"
        borderWidth="1px"
        borderColor="gray.100"
        borderRadius="2xl"
        boxShadow="sm"
        p={4}
      >
        <Flex align="center" justify="space-between" mb={3}>
          <Text fontSize="sm" fontWeight="700" color="gray.800" textTransform="capitalize">
            {anchorDate.toLocaleDateString(uiLocale, { month: 'long', year: 'numeric' })}
          </Text>
          <HStack spacing={1}>
            <IconButton
              aria-label="Previous month"
              icon={<ChevronLeft size={14} />}
              size="xs"
              variant="ghost"
              borderRadius="md"
              onClick={() => moveMiniMonth(-1)}
            />
            <IconButton
              aria-label="Next month"
              icon={<ChevronRight size={14} />}
              size="xs"
              variant="ghost"
              borderRadius="md"
              onClick={() => moveMiniMonth(1)}
            />
          </HStack>
        </Flex>

        <SimpleGrid columns={7} gap={1} mb={1}>
          {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((label: string, index: number) => (
            <Text key={`${label}-${index}`} fontSize="2xs" color="gray.400" textAlign="center" fontWeight="700">
              {label}
            </Text>
          ))}
        </SimpleGrid>

        <SimpleGrid columns={7} gap={1}>
          {miniMonthDays.map((day: Date) => {
            const isCurrentMonth = day.getMonth() === anchorDate.getMonth();
            const isToday = isSameDay(day, new Date());
            const isSelected = isSameDay(day, selectedDay);

            return (
              <Button
                key={toDayKey(day)}
                size="xs"
                h="28px"
                px={0}
                minW="28px"
                variant={isSelected ? 'solid' : 'ghost'}
                colorScheme={isSelected ? 'brand' : 'gray'}
                borderRadius="md"
                onClick={() => selectDay(day)}
                fontWeight={isSelected || isToday ? '700' : '500'}
                color={!isCurrentMonth ? 'gray.300' : undefined}
              >
                {day.getDate()}
              </Button>
            );
          })}
        </SimpleGrid>

        <Divider my={4} borderColor="gray.100" />

        <VStack spacing={2} align="stretch">
          <Text fontSize="xs" color="gray.500" fontWeight="700" textTransform="uppercase" letterSpacing="0.04em">
            Cette semaine
          </Text>
          <HStack justify="space-between">
            <Text fontSize="sm" color="gray.600">Rendez-vous</Text>
            <Badge borderRadius="full" colorScheme="brand" px={2}>{appointmentsInWeek.length}</Badge>
          </HStack>
          <HStack justify="space-between">
            <Text fontSize="sm" color="gray.600">En attente</Text>
            <Text fontSize="sm" color="gray.800" fontWeight="700">{statusCounts.pending}</Text>
          </HStack>
          <HStack justify="space-between">
            <Text fontSize="sm" color="gray.600">Confirmés</Text>
            <Text fontSize="sm" color="gray.800" fontWeight="700">{statusCounts.confirmed}</Text>
          </HStack>
        </VStack>
      </Box>

      <Box flex="1" minW={0}>
        <Box
          bg="white"
          borderWidth="1px"
          borderColor="gray.100"
          borderRadius="2xl"
          boxShadow="sm"
          overflow="hidden"
        >
          <Flex
            px={{ base: 4, md: 5 }}
            py={4}
            justify="space-between"
            align={{ base: 'stretch', md: 'center' }}
            direction={{ base: 'column', md: 'row' }}
            gap={3}
            borderBottomWidth="1px"
            borderColor="gray.100"
          >
            <HStack spacing={2}>
              <IconButton
                aria-label="Previous week"
                icon={<ChevronLeft size={16} />}
                size="sm"
                variant="ghost"
                borderRadius="lg"
                onClick={goPreviousWeek}
              />
              <IconButton
                aria-label="Next week"
                icon={<ChevronRight size={16} />}
                size="sm"
                variant="ghost"
                borderRadius="lg"
                onClick={goNextWeek}
              />
              <Button size="sm" variant="outline" borderRadius="lg" onClick={goToday}>
                Aujourd’hui
              </Button>
              <Text fontSize="lg" fontWeight="700" color="gray.900" letterSpacing="-0.01em" ml={1}>
                {formatRangeLabel(weekStart, weekEnd)}
              </Text>
            </HStack>

            <HStack spacing={2}>
              <InputGroup size="sm" w={{ base: 'full', md: '220px' }}>
                <InputLeftElement pointerEvents="none">
                  <Search size={14} color="var(--chakra-colors-gray-400)" />
                </InputLeftElement>
                <Input
                  value={searchTerm}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(event.target.value)}
                  placeholder="Rechercher client ou service"
                  borderRadius="lg"
                  borderColor="gray.200"
                />
              </InputGroup>
              <Button
                size="sm"
                colorScheme="brand"
                borderRadius="lg"
                leftIcon={<Plus size={14} />}
                onClick={() => onDayClick?.(selectedDay)}
              >
                Ajouter un rendez-vous
              </Button>
            </HStack>
          </Flex>

          <Flex px={{ base: 4, md: 5 }} py={3} gap={2} wrap="wrap" borderBottomWidth="1px" borderColor="gray.100">
            {(Object.keys(statusMeta) as StatusKey[]).map((status: StatusKey) => {
              const isActive = visibleStatuses.includes(status);
              const meta = statusMeta[status];

              return (
                <Button
                  key={status}
                  size="xs"
                  borderRadius="full"
                  variant="ghost"
                  borderWidth="1px"
                  borderColor={isActive ? 'brand.100' : 'gray.200'}
                  bg={isActive ? 'brand.50' : 'transparent'}
                  color={isActive ? 'brand.700' : 'gray.600'}
                  _hover={{
                    bg: isActive ? 'brand.100' : 'gray.50',
                    borderColor: isActive ? 'brand.200' : 'gray.300',
                  }}
                  onClick={() => toggleStatus(status)}
                  fontWeight="600"
                  aria-pressed={isActive}
                >
                  {(isFr ? meta.labelFr : meta.labelEn)} ({statusCounts[status]})
                </Button>
              );
            })}
            {hasActiveFilters && (
              <Button
                size="xs"
                borderRadius="full"
                variant="ghost"
                color="gray.600"
                onClick={resetFilters}
              >
                Réinitialiser
              </Button>
            )}
          </Flex>

          {appointmentsInWeek.length === 0 ? (
            <VStack spacing={3} py={16} bg="gray.50" px={4}>
              <Icon as={CalendarDays} boxSize={7} color="gray.300" />
              <Text fontSize="sm" color="gray.600" fontWeight="600">Aucun rendez-vous cette semaine</Text>
              <Text fontSize="xs" color="gray.500" textAlign="center">
                Commencez en ajoutant un rendez-vous pour remplir votre planning.
              </Text>
            </VStack>
          ) : filteredAppointments.length === 0 ? (
            <VStack spacing={3} py={16} bg="gray.50" px={4}>
              <Icon as={Search} boxSize={6} color="gray.300" />
              <Text fontSize="sm" color="gray.600" fontWeight="600">Aucun résultat</Text>
              <Text fontSize="xs" color="gray.500" textAlign="center">
                Aucun rendez-vous ne correspond à votre recherche ou à vos filtres actuels.
              </Text>
              <Button size="sm" variant="outline" onClick={resetFilters}>
                Réinitialiser les filtres
              </Button>
            </VStack>
          ) : (
            <SimpleGrid columns={{ base: 1, md: 2, xl: 7 }} gap={3} p={4} bg="gray.50">
              {weekDays.map((day: Date) => {
                const dayKey = toDayKey(day);
                const dayAppointments = appointmentsByDay[dayKey] || [];
                const visibleAppointments = dayAppointments.slice(0, 3);
                const hiddenAppointmentsCount = Math.max(dayAppointments.length - visibleAppointments.length, 0);
                const isSelected = isSameDay(day, selectedDay);
                const isToday = isSameDay(day, new Date());

                return (
                  <Box
                    key={dayKey}
                    bg="white"
                    borderWidth="1px"
                    borderColor={isSelected ? 'brand.200' : 'gray.100'}
                    borderRadius="xl"
                    minH="220px"
                    p={3}
                    cursor="pointer"
                    onClick={() => setSelectedDayKey(dayKey)}
                    transition="all 0.15s ease"
                    _hover={{ borderColor: isSelected ? 'brand.300' : 'gray.200', boxShadow: 'sm' }}
                  >
                    <HStack justify="space-between" mb={3}>
                      <VStack spacing={0} align="start">
                        <Text fontSize="xs" fontWeight="700" color="gray.500" letterSpacing="0.04em">
                          {formatDayShort(day)}
                        </Text>
                        <Text fontSize="lg" fontWeight="700" color={isToday ? 'brand.600' : 'gray.800'} lineHeight="1">
                          {day.getDate()}
                        </Text>
                      </VStack>
                      <Badge borderRadius="full" colorScheme={dayAppointments.length > 0 ? 'brand' : 'gray'}>
                        {dayAppointments.length}
                      </Badge>
                    </HStack>

                    {dayAppointments.length === 0 ? (
                      <Flex align="center" justify="center" h="110px">
                        <Text fontSize="xs" color="gray.400">Aucun rendez-vous</Text>
                      </Flex>
                    ) : (
                      <VStack spacing={2} align="stretch">
                        {visibleAppointments.map((appointment: FetchedAppointment) => {
                          const status = normalizeStatus(appointment.status);
                          const meta = statusMeta[status];
                          const serviceNames = appointment.services?.map((service) => service.name).join(', ') || 'Service non renseigné';

                          return (
                            <Box
                              key={appointment.id}
                              p={2.5}
                              borderRadius="lg"
                              borderWidth="1px"
                              borderColor={meta.borderColor}
                              bg={meta.bg}
                              onClick={(event: React.MouseEvent) => {
                                event.stopPropagation();
                                onAppointmentClick?.(appointment);
                              }}
                              transition="all 0.15s ease"
                              _hover={{ transform: 'translateY(-1px)', boxShadow: 'sm' }}
                            >
                              <HStack justify="space-between" mb={1}>
                                <Text fontSize="xs" fontWeight="700" color="gray.700">
                                  {formatTime(appointment.appointment_time)}
                                </Text>
                                <Badge
                                  variant="subtle"
                                  borderRadius="full"
                                  colorScheme={meta.colorScheme as any}
                                  fontSize="2xs"
                                  textTransform="none"
                                >
                                  {isFr ? meta.labelFr : meta.labelEn}
                                </Badge>
                              </HStack>
                              <HStack spacing={1.5} mb={1}>
                                <Icon as={User} boxSize={3.5} color="gray.500" />
                                <Text fontSize="sm" color="gray.800" fontWeight="600" noOfLines={1}>
                                  {appointment.client_name}
                                </Text>
                              </HStack>
                              <HStack spacing={1.5}>
                                <Icon as={Scissors} boxSize={3.5} color="gray.400" />
                                <Text fontSize="xs" color="gray.600" noOfLines={1}>
                                  {serviceNames}
                                </Text>
                              </HStack>
                            </Box>
                          );
                        })}

                        {hiddenAppointmentsCount > 0 && (
                          <Text fontSize="xs" color="gray.500" fontWeight="600" pl={1}>
                            + {hiddenAppointmentsCount} autre{hiddenAppointmentsCount > 1 ? 's' : ''} rendez-vous
                          </Text>
                        )}
                      </VStack>
                    )}
                  </Box>
                );
              })}
            </SimpleGrid>
          )}
        </Box>
        <Box
          mt={4}
          bg="white"
          borderWidth="1px"
          borderColor="gray.100"
          borderRadius="2xl"
          boxShadow="sm"
          overflow="hidden"
        >
          <Box px={4} py={3.5} borderBottomWidth="1px" borderColor="gray.100">
            <HStack spacing={2}>
              <Flex align="center" justify="center" w={8} h={8} borderRadius="lg" bg="brand.50">
                <Icon as={CalendarDays} boxSize={4} color="brand.600" />
              </Flex>
              <Box>
                <Text fontSize="sm" fontWeight="700" color="gray.800">
                  {selectedDay.toLocaleDateString(uiLocale, { weekday: 'long', day: 'numeric', month: 'long' })}
                </Text>
                <Text fontSize="xs" color="gray.500">
                  {selectedDayAppointments.length} rendez-vous
                </Text>
              </Box>
            </HStack>
          </Box>

          <Box px={4} py={3.5}>
            {selectedDayAppointments.length === 0 ? (
              <VStack spacing={3} py={8}>
                <Icon as={Clock} boxSize={7} color="gray.300" />
                <Text fontSize="sm" color="gray.500">Aucun rendez-vous prévu</Text>
                <Text fontSize="xs" color="gray.400">Utilisez « Ajouter un rendez-vous » ou cliquez sur un jour.</Text>
              </VStack>
            ) : (
              <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing={3}>
                {selectedDayAppointments.map((appointment: FetchedAppointment) => {
                  const status = normalizeStatus(appointment.status);
                  const meta = statusMeta[status];
                  const serviceNames = appointment.services?.map((service) => service.name).join(', ') || 'Service non renseigné';

                  return (
                    <Box
                      key={appointment.id}
                      p={3}
                      borderRadius="lg"
                      bg="gray.50"
                      borderLeftWidth="3px"
                      borderLeftColor={meta.borderColor}
                      onClick={() => onAppointmentClick?.(appointment)}
                      cursor="pointer"
                      _hover={{ bg: 'gray.100' }}
                      transition="background 0.15s ease"
                    >
                      <HStack justify="space-between" mb={1.5}>
                        <Text fontSize="sm" fontWeight="700" color="gray.800">
                          {formatTime(appointment.appointment_time)}
                        </Text>
                        <Badge colorScheme={meta.colorScheme as any} borderRadius="full" textTransform="none" fontSize="2xs">
                          {isFr ? meta.labelFr : meta.labelEn}
                        </Badge>
                      </HStack>
                      <Text fontSize="sm" fontWeight="600" color="gray.700" mb={0.5} noOfLines={1}>
                        {appointment.client_name}
                      </Text>
                      <Text fontSize="xs" color="gray.500" noOfLines={2}>
                        {serviceNames}
                      </Text>
                    </Box>
                  );
                })}
              </SimpleGrid>
            )}
          </Box>
        </Box>
      </Box>
    </Flex>
  );
};

export default AppointmentCalendar;
