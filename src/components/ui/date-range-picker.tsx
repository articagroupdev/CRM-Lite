"use client";

import * as React from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { CalendarBlank } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface DateRangePickerProps {
  value?: DateRange;
  onChange?: (range: DateRange | undefined) => void;
  className?: string;
  placeholder?: string;
}

export function DateRangePicker({ value, onChange, className, placeholder = "Selecciona un rango" }: DateRangePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn("justify-start text-left font-normal", !value && "text-muted-foreground", className)}
        >
          <CalendarBlank size={16} className="mr-2 opacity-70" />
          {value?.from ? (
            value.to ? (
              <>
                {format(value.from, "dd MMM yyyy", { locale: es })} – {format(value.to, "dd MMM yyyy", { locale: es })}
              </>
            ) : (
              format(value.from, "dd MMM yyyy", { locale: es })
            )
          ) : (
            placeholder
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          initialFocus
          mode="range"
          defaultMonth={value?.from}
          selected={value}
          onSelect={onChange}
          numberOfMonths={2}
          locale={es}
        />
      </PopoverContent>
    </Popover>
  );
}
