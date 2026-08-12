import * as React from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from '#/components/ui/alert-dialog.tsx';
import { AlertTriangle } from 'lucide-react';

export interface ConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title?: string;
    description?: React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    variant?: 'destructive' | 'default';
    onConfirm: () => void;
    isLoading?: boolean;
}

export function ConfirmDialog({
    open,
    onOpenChange,
    title = 'Are you sure?',
    description = 'This action cannot be undone.',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'destructive',
    onConfirm,
    isLoading = false
}: ConfirmDialogProps) {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="max-w-md bg-background">
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
                        {variant === 'destructive' && <AlertTriangle className="size-5 text-rose-500 shrink-0" />}
                        {title}
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-xs text-muted-foreground mt-1">{description}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="mt-4 gap-2">
                    <AlertDialogCancel disabled={isLoading} className="h-9 text-xs">
                        {cancelText}
                    </AlertDialogCancel>
                    <AlertDialogAction
                        variant={variant}
                        disabled={isLoading}
                        onClick={(e) => {
                            e.preventDefault();
                            onConfirm();
                        }}
                        className="h-9 text-xs font-bold"
                    >
                        {confirmText}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
