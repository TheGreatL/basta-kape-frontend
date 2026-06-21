import * as React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Sparkles, Plus, X } from 'lucide-react';

import { createAttribute, createAttributeValue } from '#/api/product-settings.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { getErrorMessage } from '#/utils/error-handler.ts';
import { attributeSchema } from '../product-settings.schema.ts';

import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Textarea } from '#/components/ui/textarea.tsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog.tsx';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '#/components/ui/form.tsx';
import { Spinner } from '#/components/ui/spinner.tsx';
import { Badge } from '#/components/ui/badge.tsx';

interface AttributeCreateDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

interface CreateAttributeFormValues {
    name: string;
    description?: string;
}

export default function AttributeCreateDialog({ open, onOpenChange }: AttributeCreateDialogProps) {
    const queryClient = useQueryClient();
    const [isRendering, setIsRendering] = React.useState(false);
    const [optionValues, setOptionValues] = React.useState<string[]>([]);
    const [newOptionValue, setNewOptionValue] = React.useState('');

    React.useEffect(() => {
        if (open) {
            const timer = setTimeout(() => setIsRendering(true), 50);
            return () => clearTimeout(timer);
        } else {
            setIsRendering(false);
        }
    }, [open]);

    const form = useForm<CreateAttributeFormValues>({
        resolver: zodResolver(attributeSchema),
        defaultValues: {
            name: '',
            description: ''
        }
    });

    React.useEffect(() => {
        if (!open) {
            form.reset({
                name: '',
                description: ''
            });
            setOptionValues([]);
            setNewOptionValue('');
        }
    }, [open, form]);

    const handleAddValue = () => {
        const val = newOptionValue.trim();
        if (val && !optionValues.includes(val)) {
            setOptionValues([...optionValues, val]);
            setNewOptionValue('');
        }
    };

    const handleRemoveValue = (index: number) => {
        setOptionValues(optionValues.filter((_, i) => i !== index));
    };

    const createMutation = useMutation({
        mutationFn: createAttribute,
        onSuccess: async (createdAttr) => {
            if (optionValues.length > 0) {
                try {
                    await Promise.all(
                        optionValues.map((value) =>
                            createAttributeValue({
                                productAttributeId: createdAttr.id,
                                value
                            })
                        )
                    );
                } catch (err) {
                    toast.error('Attribute created, but some option values failed to save');
                }
            }
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.PRODUCT_SETTINGS.ATTRIBUTES_LIST] });
            toast.success('Attribute Created', {
                description: 'The product customizing attribute has been successfully created with its values.'
            });
            onOpenChange(false);
        },
        onError: (error) => {
            toast.error('Failed to create attribute', {
                description: getErrorMessage(error)
            });
        }
    });

    const onSubmit = (values: CreateAttributeFormValues) => {
        createMutation.mutate({
            name: values.name,
            description: values.description || null
        });
    };

    const isLoading = !isRendering;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl max-h-[85vh] flex flex-col p-0 overflow-hidden bg-background">
                <DialogHeader className="px-6 pt-6 pb-2">
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                        <Sparkles className="size-5 text-primary" />
                        Create Custom Attribute
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        Define product options/dimensions (e.g. Size, Sugar Level, Milk Option).
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0">
                        <div className="flex-1 overflow-y-auto px-6 py-2 space-y-4 min-h-0">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-3">
                                    <Spinner className="h-6 w-6 text-primary animate-spin" />
                                    <span className="text-xs text-muted-foreground font-medium">Loading form...</span>
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
                                                        placeholder="Brief details about the options (e.g. Customize sweetness of coffee)..."
                                                        className="min-h-[100px] bg-background/50 resize-y"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <div className="space-y-2 pt-2">
                                        <label className="text-sm font-semibold text-foreground/80 block">Option Values List</label>
                                        <div className="flex gap-2 items-center">
                                            <Input
                                                placeholder="e.g. Regular / Large / 12oz"
                                                value={newOptionValue}
                                                onChange={(e) => setNewOptionValue(e.target.value)}
                                                className="h-9 bg-background/50"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        handleAddValue();
                                                    }
                                                }}
                                            />
                                            <Button type="button" variant="outline" onClick={handleAddValue} className="h-9 gap-1 px-3 shrink-0">
                                                <Plus className="size-4" /> Add
                                            </Button>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5 pt-1">
                                            {optionValues.length === 0 ? (
                                                <span className="text-xs text-muted-foreground italic">No values added yet. Add one above.</span>
                                            ) : (
                                                optionValues.map((val, idx) => (
                                                    <Badge
                                                        key={idx}
                                                        variant="secondary"
                                                        className="text-xs gap-1 py-1 pl-2 pr-1 bg-secondary/60 text-secondary-foreground"
                                                    >
                                                        {val}
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-4 w-4 p-0 rounded-full hover:bg-muted-foreground/20 text-muted-foreground hover:text-foreground shrink-0"
                                                            onClick={() => handleRemoveValue(idx)}
                                                        >
                                                            <X className="size-3" />
                                                        </Button>
                                                    </Badge>
                                                ))
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
                            <Button type="submit" disabled={createMutation.isPending || isLoading} className="h-9">
                                {createMutation.isPending ? (
                                    <div className="flex items-center gap-1">
                                        <Spinner className="h-4 w-4" /> Saving...
                                    </div>
                                ) : (
                                    'Create Attribute'
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
