"use client";

import React, { useState } from 'react';
import { Text, TextInput } from '@gravity-ui/uikit';
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

  // Handle date change
  const handleDateChange = (newDate: Date | null) => {
    setDate(newDate);
    
    if (newDate) {
      // Combine the new date with the existing time
      const [hours, minutes] = time.split(':').map(Number);
      const combinedDate = new Date(newDate);
      combinedDate.setHours(hours);
      combinedDate.setMinutes(minutes);
      onChange(combinedDate);
    } else {
      onChange(null);
    }
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
        onChange(combinedDate);
      }
    }
  };

  return (
    <div className="flex flex-col space-y-2">
      <Text variant="subheader-2">Schedule Date and Time</Text>
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Text variant="body-2" className="mb-1">Date</Text>
          <Calendar
            mode="single"
            selected={date || undefined}
            onSelect={handleDateChange as any}
            disabled={disabled ? true : (minDate ? (date: Date) => date < minDate : undefined)}
            className="rounded-md border"
          />
        </div>
        <div className="w-full sm:w-32">
          <Text variant="body-2" className="mb-1">Time</Text>
          <input
            type="time"
            value={time}
            onChange={handleTimeChange}
            disabled={disabled || !date}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
        </div>
      </div>
    </div>
  );
};

export default DateTimePicker;