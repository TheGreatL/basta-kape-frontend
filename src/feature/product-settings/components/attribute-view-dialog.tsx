import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sparkles, Calendar, FileText, Plus, Trash2, Edit2, Check, X, ShieldAlert, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger
} from '#/components/ui/alert-dialog.tsx';

import {
    getAttributeById,
    getAttributeValuesList,
    createAttributeValue,
    updateAttributeValue,
    deleteAttributeValue,
    restoreAttributeValue
} from '#/api/product-settings.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { getErrorMessage } from '#/utils/error-handler.ts';
import type { IAttribute, IAttributeValue } from '../product-settings-types';

import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Label } from '#/components/ui/label.tsx';
import { Textarea } from '#/components/ui/textarea.tsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog.tsx';
import { Spinner } from '#/components/ui/spinner.tsx';
import { RequirePermission } from '#/components/rbac/require-permission.tsx';

interface AttributeViewDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    attribute: IAttribute | null;
}

export default function AttributeViewDialog({ open, onOpenChange, attribute }: AttributeViewDialogProps) {
    const queryClient = useQueryClient();
    const [isRendering, setIsRendering] = React.useState(false);

    // Inline Adding State
    const [newValue, setNewValue] = React.useState('');

    // Inline Editing States
    const [editingValueId, setEditingValueId] = React.useState<string | null>(null);
    const [editingValueText, setEditingValueText] = React.useState('');

    React.useEffect(() => {
        if (open) {
            const timer = setTimeout(() => setIsRendering(true), 50);
            return () => clearTimeout(timer);
        } else {
            setIsRendering(false);
            setNewValue('');
            setEditingValueId(null);
            setEditingValueText('');
        }
    }, [open]);

    // Query 1: Attribute Details
    const { data: attributeDetails, isLoading: isDetailsLoading } = useQuery({
        queryKey: [QUERY_KEY.PRODUCT_SETTINGS.ATTRIBUTE_DETAILS, attribute?.id],
        queryFn: () => getAttributeById(attribute!.id),
        enabled: open && !!attribute?.id
    });

    // Query 2: Attribute Values List
    const { data: valuesData, isLoading: isValuesLoading } = useQuery({
        queryKey: [QUERY_KEY.PRODUCT_SETTINGS.ATTRIBUTE_VALUES_LIST, attribute?.id],
        queryFn: () => getAttributeValuesList(attribute!.id),
        enabled: open && !!attribute?.id
    });

    // Mutation 1: Create value
    const createValueMutation = useMutation({
        mutationFn: createAttributeValue,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.PRODUCT_SETTINGS.ATTRIBUTE_VALUES_LIST, attribute?.id] });
            toast.success('Option Value Added');
            setNewValue('');
        },
        onError: (error) => {
            toast.error('Failed to add value', { description: getErrorMessage(error) });
        }
    });

    // Mutation 2: Update value
    const updateValueMutation = useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: { value: string } }) => updateAttributeValue(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.PRODUCT_SETTINGS.ATTRIBUTE_VALUES_LIST, attribute?.id] });
            toast.success('Option Value Saved');
            setEditingValueId(null);
            setEditingValueText('');
        },
        onError: (error) => {
            toast.error('Failed to update value', { description: getErrorMessage(error) });
        }
    });

    // Mutation 3: Delete value
    const deleteValueMutation = useMutation({
        mutationFn: deleteAttributeValue,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.PRODUCT_SETTINGS.ATTRIBUTE_VALUES_LIST, attribute?.id] });
            toast.success('Option Value Removed');
        },
        onError: (error) => {
            toast.error('Failed to delete value', { description: getErrorMessage(error) });
        }
    });

    // Mutation 4: Restore value
    const restoreValueMutation = useMutation({
        mutationFn: restoreAttributeValue,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.PRODUCT_SETTINGS.ATTRIBUTE_VALUES_LIST, attribute?.id] });
            toast.success('Option Value Restored');
        },
        onError: (error) => {
            toast.error('Failed to restore value', { description: getErrorMessage(error) });
        }
    });

    const handleAddValue = (e: React.FormEvent) => {
        e.preventDefault();
        if (!attribute || !newValue.trim()) return;
        createValueMutation.mutate({
            productAttributeId: attribute.id,
            value: newValue.trim()
        });
    };

    const handleStartEdit = (val: IAttributeValue) => {
        setEditingValueId(val.id);
        setEditingValueText(val.value);
    };

    const handleSaveEdit = (valId: string) => {
        if (!editingValueText.trim()) return;
        updateValueMutation.mutate({
            id: valId,
            payload: { value: editingValueText.trim() }
        });
    };

    const isDataLoading = isDetailsLoading || !isRendering;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden bg-background">
                <DialogHeader className="px-6 pt-6 pb-2">
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                        <Sparkles className="size-5 text-primary" />
                        Custom Option Details
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        Audit attribute settings and manage custom values list (e.g. Small, Medium, Large).
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-6 py-2 space-y-5 min-h-0">
                    {isDataLoading ? (
                        <div className="flex flex-col items-center justify-center py-24 gap-3">
                            <Spinner className="h-6 w-6 text-primary animate-spin" />
                            <span className="text-xs text-muted-foreground font-medium">Loading details...</span>
                        </div>
                    ) : (
                        attributeDetails && (
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2 sm:col-span-2">
                                        <Label className="font-semibold text-foreground/80">Option Name</Label>
                                        <Input disabled value={attributeDetails.name} className="h-9 bg-background/50" />
                                    </div>

                                    <div className="space-y-2 sm:col-span-2">
                                        <Label className="font-semibold text-foreground/80 flex items-center gap-1.5">
                                            <FileText className="size-3.5 text-muted-foreground" />
                                            Description
                                        </Label>
                                        <Textarea
                                            disabled
                                            value={attributeDetails.description || 'No description provided.'}
                                            className="min-h-[70px] bg-background/50"
                                        />
                                    </div>
                                </div>

                                {/* Custom Values List Manager */}
                                <div className="space-y-3 pt-2">
                                    <div className="flex items-center justify-between border-b pb-1">
                                        <h3 className="text-sm font-bold text-foreground/80 flex items-center gap-1.5">
                                            <Sparkles className="size-4 text-primary" />
                                            Option Values List
                                        </h3>
                                        <span className="text-xs text-muted-foreground font-medium">Customize modifier names.</span>
                                    </div>

                                    {/* Inline Add Form */}
                                    <RequirePermission module="Product Settings Management" action="update">
                                        <form onSubmit={handleAddValue} className="flex gap-2 items-center">
                                            <Input
                                                placeholder="Add new option value (e.g. Oat Milk)"
                                                value={newValue}
                                                onChange={(e) => setNewValue(e.target.value)}
                                                className="h-9 bg-background/50"
                                                disabled={createValueMutation.isPending}
                                            />
                                            <Button
                                                type="submit"
                                                disabled={!newValue.trim() || createValueMutation.isPending}
                                                className="h-9 gap-1 shrink-0"
                                            >
                                                <Plus className="size-4" /> Add
                                            </Button>
                                        </form>
                                    </RequirePermission>

                                    {/* Values List Container */}
                                    <div className="border border-border/40 rounded-lg overflow-hidden max-h-[200px] overflow-y-auto bg-background/30">
                                        {isValuesLoading ? (
                                            <div className="flex items-center justify-center py-10 gap-2">
                                                <Spinner className="h-4 w-4 animate-spin text-primary" />
                                                <span className="text-xs text-muted-foreground">Fetching values list...</span>
                                            </div>
                                        ) : valuesData?.data.length === 0 ? (
                                            <div className="text-center py-8 text-xs text-muted-foreground font-medium flex flex-col items-center gap-1.5">
                                                <ShieldAlert className="size-4 text-muted-foreground" />
                                                No option values added yet. Add values above.
                                            </div>
                                        ) : (
                                            <ul className="divide-y divide-border/30">
                                                {valuesData?.data.map((val: IAttributeValue) => (
                                                    <li
                                                        key={val.id}
                                                        className="flex items-center justify-between p-2.5 hover:bg-muted/20 transition-colors"
                                                    >
                                                        {editingValueId === val.id ? (
                                                            <div className="flex items-center gap-1.5 flex-1 mr-4">
                                                                <Input
                                                                    value={editingValueText}
                                                                    onChange={(e) => setEditingValueText(e.target.value)}
                                                                    className="h-8 py-1 px-2 text-xs flex-1 bg-background"
                                                                    autoFocus
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter') handleSaveEdit(val.id);
                                                                        if (e.key === 'Escape') setEditingValueId(null);
                                                                    }}
                                                                />
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="size-7 text-emerald-600 hover:text-emerald-700 shrink-0"
                                                                    onClick={() => handleSaveEdit(val.id)}
                                                                    disabled={updateValueMutation.isPending}
                                                                >
                                                                    <Check className="size-3.5" />
                                                                </Button>
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="size-7 text-destructive hover:text-destructive shrink-0"
                                                                    onClick={() => setEditingValueId(null)}
                                                                >
                                                                    <X className="size-3.5" />
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <span className="text-xs font-semibold text-foreground/80 capitalize">
                                                                    {val.value}
                                                                </span>
                                                                <div className="flex items-center gap-1 shrink-0">
                                                                    <RequirePermission module="Product Settings Management" action="update">
                                                                        {!val.deletedAt && (
                                                                            <Button
                                                                                size="icon"
                                                                                variant="ghost"
                                                                                className="size-7 text-muted-foreground hover:text-primary"
                                                                                onClick={() => handleStartEdit(val)}
                                                                            >
                                                                                <Edit2 className="size-3.5" />
                                                                            </Button>
                                                                        )}
                                                                    </RequirePermission>
                                                                    <RequirePermission module="Product Settings Management" action="delete">
                                                                        {val.deletedAt ? (
                                                                            <AlertDialog>
                                                                                <AlertDialogTrigger asChild>
                                                                                    <Button
                                                                                        size="icon"
                                                                                        variant="ghost"
                                                                                        className="size-7 text-muted-foreground hover:text-emerald-600"
                                                                                        title="Restore Value"
                                                                                        disabled={restoreValueMutation.isPending}
                                                                                    >
                                                                                        <RotateCcw className="size-3.5" />
                                                                                    </Button>
                                                                                </AlertDialogTrigger>
                                                                                <AlertDialogContent>
                                                                                    <AlertDialogHeader>
                                                                                        <AlertDialogTitle className="flex items-center gap-2 font-bold text-foreground">
                                                                                            <RotateCcw className="size-5 text-emerald-600" />
                                                                                            Restore Option Value
                                                                                        </AlertDialogTitle>
                                                                                        <AlertDialogDescription>
                                                                                            Are you sure you want to restore the option value{' '}
                                                                                            <strong>"{val.value}"</strong>? This will reactivate the
                                                                                            value for the custom option modifiers.
                                                                                        </AlertDialogDescription>
                                                                                    </AlertDialogHeader>
                                                                                    <AlertDialogFooter>
                                                                                        <AlertDialogCancel className="h-9">Cancel</AlertDialogCancel>
                                                                                        <AlertDialogAction
                                                                                            onClick={() => restoreValueMutation.mutate(val.id)}
                                                                                            className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                                                                                        >
                                                                                            Confirm Restore
                                                                                        </AlertDialogAction>
                                                                                    </AlertDialogFooter>
                                                                                </AlertDialogContent>
                                                                            </AlertDialog>
                                                                        ) : (
                                                                            <Button
                                                                                size="icon"
                                                                                variant="ghost"
                                                                                className="size-7 text-muted-foreground hover:text-destructive"
                                                                                onClick={() => deleteValueMutation.mutate(val.id)}
                                                                                disabled={deleteValueMutation.isPending}
                                                                            >
                                                                                <Trash2 className="size-3.5" />
                                                                            </Button>
                                                                        )}
                                                                    </RequirePermission>
                                                                </div>
                                                            </>
                                                        )}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </div>

                                {/* Audit Logs timestamps */}
                                <div className="space-y-3 pt-2">
                                    <div className="flex items-center justify-between border-b pb-1">
                                        <h3 className="text-xs font-bold text-foreground/80 flex items-center gap-1.5">
                                            <Calendar className="size-3.5 text-primary" />
                                            System Audit Logs
                                        </h3>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg border border-border/40">
                                        <div>
                                            <span className="font-medium text-foreground/75 block">Created Date</span>
                                            {format(new Date(attributeDetails.createdAt), 'MMMM dd, yyyy - hh:mm a')}
                                            {attributeDetails.createdBy && (
                                                <span className="block mt-0.5 text-muted-foreground/80">
                                                    by {attributeDetails.createdBy.firstName} {attributeDetails.createdBy.lastName}
                                                </span>
                                            )}
                                        </div>
                                        <div>
                                            <span className="font-medium text-foreground/75 block">Last Updated</span>
                                            {format(new Date(attributeDetails.updatedAt), 'MMMM dd, yyyy - hh:mm a')}
                                            {attributeDetails.updatedBy && (
                                                <span className="block mt-0.5 text-muted-foreground/80">
                                                    by {attributeDetails.updatedBy.firstName} {attributeDetails.updatedBy.lastName}
                                                </span>
                                            )}
                                        </div>
                                        {attributeDetails.deletedAt && (
                                            <div className="sm:col-span-2 text-destructive font-medium border-t pt-2 mt-1">
                                                <span>Archived / Soft Deleted At</span>:{' '}
                                                {format(new Date(attributeDetails.deletedAt), 'MMMM dd, yyyy - hh:mm a')}
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
