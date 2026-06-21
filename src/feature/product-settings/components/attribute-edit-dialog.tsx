import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Sparkles, Plus, Trash2, Edit2, Check, X, ShieldAlert, RotateCcw } from 'lucide-react';

import {
    updateAttribute,
    getAttributeValuesList,
    createAttributeValue,
    updateAttributeValue,
    deleteAttributeValue,
    restoreAttributeValue
} from '#/api/product-settings.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { getErrorMessage } from '#/utils/error-handler.ts';
import { attributeSchema } from '../product-settings.schema.ts';
import type { IAttribute, IAttributeValue, IUpdateAttributePayload } from '../product-settings-types';

import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Textarea } from '#/components/ui/textarea.tsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog.tsx';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '#/components/ui/form.tsx';
import { Spinner } from '#/components/ui/spinner.tsx';
import { RequirePermission } from '#/components/rbac/require-permission.tsx';
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

interface AttributeEditDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    attribute: IAttribute | null;
}

interface EditAttributeFormValues {
    name: string;
    description?: string;
}

export default function AttributeEditDialog({ open, onOpenChange, attribute }: AttributeEditDialogProps) {
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

    const form = useForm<EditAttributeFormValues>({
        resolver: zodResolver(attributeSchema),
        defaultValues: {
            name: '',
            description: ''
        }
    });

    React.useEffect(() => {
        if (open && attribute) {
            form.reset({
                name: attribute.name,
                description: attribute.description || ''
            });
        }
    }, [open, attribute, form]);

    // Query for Attribute Values
    const { data: valuesData, isLoading: isValuesLoading } = useQuery({
        queryKey: [QUERY_KEY.PRODUCT_SETTINGS.ATTRIBUTE_VALUES_LIST, attribute?.id],
        queryFn: () => getAttributeValuesList(attribute!.id),
        enabled: open && !!attribute?.id
    });

    const editMutation = useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: IUpdateAttributePayload }) => updateAttribute(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.PRODUCT_SETTINGS.ATTRIBUTES_LIST] });
            if (attribute) {
                queryClient.invalidateQueries({ queryKey: [QUERY_KEY.PRODUCT_SETTINGS.ATTRIBUTE_DETAILS, attribute.id] });
            }
            toast.success('Attribute Updated', {
                description: 'The changes to the custom attribute have been successfully saved.'
            });
            onOpenChange(false);
        },
        onError: (error) => {
            toast.error('Failed to update attribute', {
                description: getErrorMessage(error)
            });
        }
    });

    // Mutations for Option Values
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

    const onSubmit = (values: EditAttributeFormValues) => {
        if (!attribute) return;
        editMutation.mutate({
            id: attribute.id,
            payload: {
                name: values.name,
                description: values.description || null
            }
        });
    };

    const isLoading = !isRendering || !attribute;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl max-h-[85vh] flex flex-col p-0 overflow-hidden bg-background">
                <DialogHeader className="px-6 pt-6 pb-2">
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                        <Sparkles className="size-5 text-primary" />
                        Modify Custom Attribute
                    </DialogTitle>
                    <DialogDescription className="text-xs">Update the attribute name and description details.</DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0">
                        <div className="flex-1 overflow-y-auto px-6 py-2 space-y-4 min-h-0">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-3">
                                    <Spinner className="h-6 w-6 text-primary animate-spin" />
                                    <span className="text-xs text-muted-foreground font-medium">Fetching details...</span>
                                </div>
                            ) : (
                                <>
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="font-semibold text-foreground/80">Attribute Name</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g. Sugar Level" {...field} className="h-9 bg-background/50" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="description"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="font-semibold text-foreground/80">Description</FormLabel>
                                                <FormControl>
                                                    <Textarea
                                                        placeholder="Brief details about the options..."
                                                        className="min-h-[80px] bg-background/50 resize-y"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {/* Custom Values List Manager */}
                                    <div className="space-y-3 pt-2">
                                        <div className="flex items-center justify-between border-b pb-1">
                                            <h3 className="text-xs font-bold text-foreground/80 flex items-center gap-1.5">
                                                <Sparkles className="size-3.5 text-primary" />
                                                Option Values List
                                            </h3>
                                            <span className="text-xs text-muted-foreground">Add choices (e.g. Small, Medium)</span>
                                        </div>

                                        {/* Inline Add Form */}
                                        <RequirePermission module="Product Settings Management" action="update">
                                            <form onSubmit={handleAddValue} className="flex gap-2 items-center">
                                                <Input
                                                    placeholder="Add new option value (e.g. Oat Milk)"
                                                    value={newValue}
                                                    onChange={(e) => setNewValue(e.target.value)}
                                                    className="h-9 bg-background/50 text-xs"
                                                    disabled={createValueMutation.isPending}
                                                />
                                                <Button
                                                    type="submit"
                                                    disabled={!newValue.trim() || createValueMutation.isPending}
                                                    className="h-9 gap-1 px-3 shrink-0"
                                                >
                                                    <Plus className="size-4" /> Add
                                                </Button>
                                            </form>
                                        </RequirePermission>

                                        {/* Values List Container */}
                                        <div className="border border-border/40 rounded-lg overflow-hidden max-h-[160px] overflow-y-auto bg-background/30">
                                            {isValuesLoading ? (
                                                <div className="flex items-center justify-center py-6 gap-2">
                                                    <Spinner className="h-4 w-4 animate-spin text-primary" />
                                                    <span className="text-xs text-muted-foreground">Fetching values...</span>
                                                </div>
                                            ) : valuesData?.data.length === 0 ? (
                                                <div className="text-center py-6 text-xs text-muted-foreground font-medium flex flex-col items-center gap-1.5">
                                                    <ShieldAlert className="size-4 text-muted-foreground" />
                                                    No option values added yet. Add values above.
                                                </div>
                                            ) : (
                                                <ul className="divide-y divide-border/30">
                                                    {valuesData?.data.map((val: IAttributeValue) => (
                                                        <li
                                                            key={val.id}
                                                            className="flex items-center justify-between p-2 hover:bg-muted/20 transition-colors"
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
                                                                        type="button"
                                                                        size="icon"
                                                                        variant="ghost"
                                                                        className="size-7 text-emerald-600 hover:text-emerald-700 shrink-0"
                                                                        onClick={() => handleSaveEdit(val.id)}
                                                                        disabled={updateValueMutation.isPending}
                                                                    >
                                                                        <Check className="size-3.5" />
                                                                    </Button>
                                                                    <Button
                                                                        type="button"
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
                                                                    <span className="text-xs font-semibold text-foreground/80 capitalize pl-1">
                                                                        {val.value}
                                                                    </span>
                                                                    <div className="flex items-center gap-1 shrink-0">
                                                                        <RequirePermission module="Product Settings Management" action="update">
                                                                            {!val.deletedAt && (
                                                                                <Button
                                                                                    type="button"
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
                                                                                            type="button"
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
                                                                                                <strong>"{val.value}"</strong>? This will reactivate
                                                                                                the value for custom option modifiers.
                                                                                            </AlertDialogDescription>
                                                                                        </AlertDialogHeader>
                                                                                        <AlertDialogFooter>
                                                                                            <AlertDialogCancel className="h-9">
                                                                                                Cancel
                                                                                            </AlertDialogCancel>
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
                                                                                    type="button"
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
                                </>
                            )}
                        </div>

                        <DialogFooter className="px-6 py-4 border-t bg-muted/30 mt-4">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-9">
                                Cancel
                            </Button>
                            <Button type="submit" disabled={editMutation.isPending || isLoading} className="h-9">
                                {editMutation.isPending ? (
                                    <div className="flex items-center gap-1">
                                        <Spinner className="h-4 w-4" /> Saving...
                                    </div>
                                ) : (
                                    'Save Changes'
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
