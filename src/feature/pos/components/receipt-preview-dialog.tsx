import * as React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog.tsx';
import { Button } from '#/components/ui/button.tsx';
import { Spinner } from '#/components/ui/spinner.tsx';
import { CheckCircle2, Printer } from 'lucide-react';

interface ReceiptPreviewDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    isLoading: boolean;
    receiptHtml: string | null;
    onPrint: () => void;
    iframeRef: React.RefObject<HTMLIFrameElement | null>;
}

export const ReceiptPreviewDialog: React.FC<ReceiptPreviewDialogProps> = ({ open, onOpenChange, isLoading, receiptHtml, onPrint, iframeRef }) => {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-sm bg-background border-border/60 rounded-2xl p-0 overflow-hidden shadow-2xl flex flex-col h-[85vh]">
                <DialogHeader className="px-6 pt-5 pb-2 shrink-0 border-b">
                    <DialogTitle className="text-center text-sm font-bold text-foreground uppercase t flex items-center justify-center gap-1.5">
                        <CheckCircle2 className="size-4.5 text-emerald-500" />
                        Checkout Complete
                    </DialogTitle>
                    <DialogDescription className="text-center text-2xs text-muted-foreground mt-0.5">
                        Receipt details generated. Trigger thermal printer to generate customer ticket copies.
                    </DialogDescription>
                </DialogHeader>

                {/* Receipt Body Frame */}
                <div className="flex-1 p-4 bg-muted/10 overflow-hidden min-h-0 flex flex-col">
                    {isLoading ? (
                        <div className="flex-1 flex flex-col items-center justify-center gap-2">
                            <Spinner className="size-5 animate-spin text-primary" />
                            <span className="text-xs text-muted-foreground">Rendering thermal receipt preview...</span>
                        </div>
                    ) : (
                        <iframe
                            ref={iframeRef}
                            srcDoc={receiptHtml || ''}
                            className="w-full h-full border border-border/50 rounded-lg bg-white shadow-2xs"
                            title="Receipt Print Frame"
                        />
                    )}
                </div>

                <DialogFooter className="px-6 py-3 border-t bg-muted/20 shrink-0 grid grid-cols-2 gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="h-8.5 text-xs font-semibold">
                        Dismiss Preview
                    </Button>
                    <Button
                        onClick={onPrint}
                        disabled={isLoading || !receiptHtml}
                        className="h-8.5 text-xs font-bold bg-primary text-primary-foreground shadow-xs gap-1.5"
                    >
                        <Printer className="size-3.5" />
                        Print Receipt Copy
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
