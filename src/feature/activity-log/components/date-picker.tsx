import * as React from 'react';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { format, parse, isValid } from 'date-fns';

import { Button } from '#/components/ui/button.tsx';
import { Label } from '#/components/ui/label.tsx';
import { Calendar } from '#/components/ui/calendar.tsx';
import { Popover, PopoverContent, PopoverTrigger } from '#/components/ui/popover.tsx';
import { cn } from '#/lib/utils.ts';

interface DatePickerProps {
    value?: string;
    onChange: (dateStr: string) => void;
    placeholder?: string;
    label: string;
}

export function DatePicker({ value, onChange, placeholder = 'Pick a date', label }: DatePickerProps) {
    const [open, setOpen] = React.useState(false);

    const date = React.useMemo(() => {
        if (!value) return undefined;
        const parsed = parse(value, 'yyyy-MM-dd', new Date());
        return isValid(parsed) ? parsed : undefined;
    }, [value]);

    return (
        <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground font-medium hidden md:inline">{label}</Label>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                            'h-9 justify-start text-left font-normal bg-background/50 border-input w-[140px] md:w-[160px] text-xs px-3',
                            !date && 'text-muted-foreground'
                        )}
                    >
                        {date ? (
                            <span className="flex items-center justify-between w-full text-xs">
                                <span className="truncate">{format(date, 'MMM d, yyyy')}</span>
                                <span
                                    role="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onChange('');
                                    }}
                                    className="ml-1 p-0.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
                                >
                                    <X className="h-3 w-3" />
                                </span>
                            </span>
                        ) : (
                            <>
                                <CalendarIcon className="mr-2 h-4 w-4 shrink-0 opacity-70" />
                                <span>{placeholder}</span>
                            </>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        mode="single"
                        selected={date}
                        onSelect={(selectedDate) => {
                            onChange(selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '');
                            setOpen(false);
                        }}
                    />
                </PopoverContent>
            </Popover>
        </div>
    );
}
