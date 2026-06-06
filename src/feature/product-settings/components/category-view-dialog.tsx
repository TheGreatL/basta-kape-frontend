import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Folder, Calendar, FileText } from 'lucide-react';
import { format } from 'date-fns';

import { getCategoryById } from '#/api/product-settings.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import type { ICategory } from '../product-settings-types';

import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Label } from '#/components/ui/label.tsx';
import { Textarea } from '#/components/ui/textarea.tsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog.tsx';
import { Spinner } from '#/components/ui/spinner.tsx';

interface CategoryViewDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    category: ICategory | null;
}

export default function CategoryViewDialog({ open, onOpenChange, category }: CategoryViewDialogProps) {
    const [isRendering, setIsRendering] = React.useState(false);

    React.useEffect(() => {
        if (open) {
            const timer = setTimeout(() => setIsRendering(true), 50);
            return () => clearTimeout(timer);
        } else {
            setIsRendering(false);
        }
    }, [open]);

    const { data: categoryDetails, isLoading } = useQuery({
        queryKey: [QUERY_KEY.PRODUCT_SETTINGS.CATEGORY_DETAILS, category?.id],
        queryFn: () => getCategoryById(category!.id),
        enabled: open && !!category?.id
    });

    const isDataLoading = isLoading || !isRendering;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl max-h-[85vh] flex flex-col p-0 overflow-hidden bg-background">
                <DialogHeader className="px-6 pt-6 pb-2">
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                        <Folder className="size-5 text-primary" />
                        Category Profile Overview
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        Audit profile, registered metadata, and timestamps for this product category.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-6 py-2 space-y-4 min-h-0">
                    {isDataLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <Spinner className="h-6 w-6 text-primary animate-spin" />
                            <span className="text-xs text-muted-foreground font-medium">Loading details...</span>
                        </div>
                    ) : (
                        categoryDetails && (
                            <>
                                <div className="space-y-2">
                                    <Label className="font-semibold text-foreground/80 flex items-center gap-1.5">Category Name</Label>
                                    <Input disabled value={categoryDetails.name} className="h-9 bg-background/50" />
                                </div>

                                <div className="space-y-2">
                                    <Label className="font-semibold text-foreground/80 flex items-center gap-1.5">
                                        <FileText className="size-3.5 text-muted-foreground" />
                                        Description
                                    </Label>
                                    <Textarea
                                        disabled
                                        value={categoryDetails.description || 'No description provided.'}
                                        className="min-h-[100px] bg-background/50"
                                    />
                                </div>

                                {/* Audit Card */}
                                <div className="space-y-3 pt-2">
                                    <div className="flex items-center justify-between border-b pb-1">
                                        <h3 className="text-xs font-bold text-foreground/80 flex items-center gap-1.5">
                                            <Calendar className="size-3.5 text-primary" />
                                            System Timestamps
                                        </h3>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg border border-border/40">
                                        <div>
                                            <span className="font-medium text-foreground/75 block">Created Date</span>
                                            {format(new Date(categoryDetails.createdAt), 'MMMM dd, yyyy - hh:mm a')}
                                        </div>
                                        <div>
                                            <span className="font-medium text-foreground/75 block">Last Updated</span>
                                            {format(new Date(categoryDetails.updatedAt), 'MMMM dd, yyyy - hh:mm a')}
                                        </div>
                                        {categoryDetails.deletedAt && (
                                            <div className="sm:col-span-2 text-destructive font-medium border-t pt-2 mt-1">
                                                <span>Archived / Soft Deleted At</span>:{' '}
                                                {format(new Date(categoryDetails.deletedAt), 'MMMM dd, yyyy - hh:mm a')}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        )
                    )}
                </div>

                <DialogFooter className="px-6 py-4 border-t bg-muted/30 mt-4">
                    <Button type="button" onClick={() => onOpenChange(false)} className="h-9">
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
