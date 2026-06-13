import * as React from 'react';
import { Check, Copy } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from './button.tsx';
import { cn } from '#/lib/utils.ts';

interface CopyButtonProps {
    value: string;
    description?: string;
    className?: string;
}

export function CopyButton({ value, description = 'Copied to clipboard', className }: CopyButtonProps) {
    const [copied, setCopied] = React.useState(false);

    const handleCopy = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            toast.success(description);
            setTimeout(() => setCopied(false), 1500);
        } catch (err) {
            toast.error('Failed to copy to clipboard');
        }
    };

    return (
        <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className={cn('text-muted-foreground hover:text-foreground hover:bg-accent/40 active:scale-95 transition-all shrink-0', className)}
            onClick={handleCopy}
            title={`Copy "${value}"`}
        >
            {copied ? (
                <Check className="size-3 text-emerald-600 animate-in fade-in zoom-in duration-200" />
            ) : (
                <Copy className="size-3 transition-transform duration-200" />
            )}
            <span className="sr-only">Copy</span>
        </Button>
    );
}
