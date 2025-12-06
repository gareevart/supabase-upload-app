"use client";

import React, { useState, useEffect } from 'react';
import { Text } from '@gravity-ui/uikit';
import { Calendar } from '@/app/components/ui/calendar';
import { DateTimePickerProps } from './types';

const DateTimePicker: React.FC<DateTimePickerProps> = ({
  value,
  onChange,
  minDate,
  disabled = false,
}) => {
  // Split the date and time for the separate pickers
  const [date, setDate] = useState<Date | null>(value);
  const [time, setTime] = useState<string>(
    value ?
      `${value.getHours().toString().padStart(2, '0')}:${value.getMinutes().toString().padStart(2, '0')}` :
      '12:00'
  );

  // Sync internal state with external value prop
  useEffect(() => {
    if (value) {
      setDate(value);
      setTime(`${value.getHours().toString().padStart(2, '0')}:${value.getMinutes().toString().padStart(2, '0')}`);
    } else {
      setDate(null);
      setTime('12:00');
    }
  }, [value]);

  // Handle date change
  const handleDateChange = (newDate: Date | undefined) => {
    if (!newDate) {
      setDate(null);
      onChange(null);
      return;
    }

    setDate(newDate);

    // Combine the new date with the existing time
    const [hours, minutes] = time.split(':').map(Number);
    const combinedDate = new Date(newDate);
    combinedDate.setHours(hours);
    combinedDate.setMinutes(minutes);
    combinedDate.setSeconds(0);
    combinedDate.setMilliseconds(0);
    onChange(combinedDate);
  };

  // Handle time change
  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value;
    setTime(newTime);

    if (date) {
      // Combine the existing date with the new time
      const [hours, minutes] = newTime.split(':').map(Number);
      if (!isNaN(hours) && !isNaN(minutes)) {
        const combinedDate = new Date(date);
        combinedDate.setHours(hours);
        combinedDate.setMinutes(minutes);
        combinedDate.setSeconds(0);
        combinedDate.setMilliseconds(0);
        onChange(combinedDate);
      }
    } else {
      // If no date is selected, create a date for today with the selected time
      const today = new Date();
      const [hours, minutes] = newTime.split(':').map(Number);
      if (!isNaN(hours) && !isNaN(minutes)) {
        today.setHours(hours);
        today.setMinutes(minutes);
        today.setSeconds(0);
        today.setMilliseconds(0);

        // If the time is in the past, set it for tomorrow
        if (minDate && today < minDate) {
          today.setDate(today.getDate() + 1);
        }

        setDate(today);
        onChange(today);
      }
    }
  };

  // Calculate disabled dates for calendar
  const isDateDisabled = (dateToCheck: Date): boolean => {
    if (disabled) return true;
    if (minDate) {
      const checkDate = new Date(dateToCheck);
      checkDate.setHours(0, 0, 0, 0);
      const minDateStart = new Date(minDate);
      minDateStart.setHours(0, 0, 0, 0);
      return checkDate < minDateStart;
    }
    return false;
  };

  return (
    <div className="flex flex-col space-y-4">
      <Text variant="subheader-2">Расписание отправки</Text>
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Text variant="body-2" className="mb-2 block">Дата</Text>
          <Calendar
            mode="single"
            selected={date || undefined}
            onSelect={handleDateChange}
            disabled={isDateDisabled}
            className="rounded-md border"
          />
        </div>
        <div className="w-full sm:w-48">
          <Text variant="body-2" className="mb-2 block">Время</Text>
          <input
            type="time"
            value={time}
            onChange={handleTimeChange}
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          {date && (
            <Text variant="caption-1" color="secondary" className="mt-2 block">
              Выбрано: {date.toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
              })} в {time}
            </Text>
          )}
        </div>
      </div>
    </div>
  );
};

export default DateTimePicker;