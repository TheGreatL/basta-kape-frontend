import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Percent, Coins } from 'lucide-react';
import { toast } from 'sonner';

import { getDiscountsConfig, deleteDiscountConfig, updateDiscountConfig } from '#/api/discounts.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { getErrorMessage } from '#/utils/error-handler.ts';
import type { IDiscount } from '../discounts.types';

import { Button } from '#/components/ui/button.tsx';
import { Badge } from '#/components/ui/badge.tsx';
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card.tsx';
import { Spinner } from '#/components/ui/spinner.tsx';
import { Switch } from '#/components/ui/switch.tsx';
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

import DiscountDialog from './discount-dialog.tsx';

interface DiscountManagerProps {
    canUpdate: boolean;
    canDelete: boolean;
}

export default function DiscountManager({ canUpdate, canDelete }: DiscountManagerProps) {
    const queryClient = useQueryClient();
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    const [selectedDiscount, setSelectedDiscount] = React.useState<IDiscount | null>(null);

    // Fetch discounts configuration list
    const { data: discounts, isLoading } = useQuery({
        queryKey: [QUERY_KEY.STORE_SETTINGS.DISCOUNTS_LIST],
        queryFn: getDiscountsConfig
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: deleteDiscountConfig,
        onSuccess: (deleted) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.STORE_SETTINGS.DISCOUNTS_LIST] });
            toast.success(`Discount "${deleted.name}" configuration deleted successfully.`);
        },
        onError: (err) => {
            toast.error('Failed to delete discount configuration', {
                description: getErrorMessage(err)
            });
        }
    });

    // Toggle active state mutation
    const toggleActiveMutation = useMutation({
        mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => updateDiscountConfig(id, { isActive }),
        onSuccess: (updated) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.STORE_SETTINGS.DISCOUNTS_LIST] });
            toast.success(updated.isActive ? `Discount "${updated.name}" is now active.` : `Discount "${updated.name}" is now inactive.`);
        },
        onError: (err) => {
            toast.error('Failed to update discount status', {
                description: getErrorMessage(err)
            });
        }
    });

    const handleCreate = () => {
        setSelectedDiscount(null);
        setIsDialogOpen(true);
    };

    const handleEdit = (discount: IDiscount) => {
        setSelectedDiscount(discount);
        setIsDialogOpen(true);
    };

    const handleToggleActive = (discount: IDiscount) => {
        if (!canUpdate) return;
        toggleActiveMutation.mutate({ id: discount.id, isActive: !discount.isActive });
    };

    if (isLoading) {
        return (
            <div className="flex min-h-[300px] items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <Spinner className="h-7 w-7 text-primary animate-spin" />
                    <p className="text-sm text-muted-foreground font-medium">Loading discount configurations...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header / Actions Row */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="text-lg font-bold text-foreground/90 leading-tight">Discount Configurations</h2>
                    <p className="text-xs text-muted-foreground">
                        Configure discounts, promotional campaigns, and governmental BIR SC/PWD exemption rules.
                    </p>
                </div>
                {canUpdate && (
                    <Button onClick={handleCreate} className="h-9 gap-1.5 shadow-sm">
                        <Plus className="size-4" />
                        Create Discount
                    </Button>
                )}
            </div>

            {/* List / Cards Layout */}
            {!discounts || discounts.length === 0 ? (
                <Card className="border-border/60 bg-card/40 backdrop-blur-xs py-12 text-center shadow-xs">
                    <CardContent className="flex flex-col items-center justify-center p-6 space-y-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/30 text-muted-foreground">
                            <Percent className="size-6" />
                        </div>
                        <h3 className="text-sm font-bold text-foreground">No Discount Configurations Found</h3>
                        <p className="text-xs text-muted-foreground max-w-xs leading-normal">
                            No discounts have been set up yet. Add a percentage or fixed discount to use at checkout.
                        </p>
                        {canUpdate && (
                            <Button variant="outline" size="sm" onClick={handleCreate} className="mt-2 text-xs">
                                Create First Discount
                            </Button>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {discounts.map((discount: IDiscount) => {
                        const isBIR =
                            discount.name.toLowerCase().includes('senior') ||
                            discount.name.toLowerCase().includes('sc') ||
                            discount.name.toLowerCase().includes('pwd') ||
                            (discount.code ?? '').toLowerCase().includes('senior') ||
                            (discount.code ?? '').toLowerCase().includes('sc') ||
                            (discount.code ?? '').toLowerCase().includes('pwd');

                        return (
                            <Card
                                key={discount.id}
                                className={`shadow-xs border-border/60 transition-all ${
                                    discount.isActive ? 'bg-card/40 hover:bg-card/65' : 'bg-muted/10 opacity-75'
                                }`}
                            >
                                <CardHeader className="pb-3 border-b border-border/20 flex flex-row items-start justify-between">
                                    <div className="space-y-1">
                                        <CardTitle className="text-sm font-bold text-foreground/90 line-clamp-1">{discount.name}</CardTitle>
                                        <div className="flex flex-wrap gap-1">
                                            {discount.code && (
                                                <Badge
                                                    variant="outline"
                                                    className="text-xs font-mono font-semibold py-0 px-1.5 uppercase bg-muted/20"
                                                >
                                                    Code: {discount.code}
                                                </Badge>
                                            )}
                                            {isBIR && (
                                                <Badge className="text-xs font-semibold py-0 px-1.5 bg-amber-500/10 text-amber-600 border border-amber-500/20">
                                                    BIR SC/PWD Exempt
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    <Badge
                                        variant={discount.isActive ? 'default' : 'outline'}
                                        className={`text-xs font-bold py-0 px-1.5 scale-90 ${
                                            discount.isActive ? 'bg-emerald-600/10 text-emerald-700 border-emerald-600/20' : 'text-muted-foreground'
                                        }`}
                                    >
                                        {discount.isActive ? 'Active' : 'Inactive'}
                                    </Badge>
                                </CardHeader>
                                <CardContent className="pt-3.5 space-y-4">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            {discount.type === 'PERCENTAGE' ? (
                                                <Percent className="size-4 text-primary" />
                                            ) : (
                                                <Coins className="size-4 text-primary" />
                                            )}
                                            <span className="font-medium">Discount Value</span>
                                        </div>
                                        <span className="text-base font-bold text-foreground">
                                            {discount.type === 'PERCENTAGE'
                                                ? `${discount.value.toFixed(1)}%`
                                                : `₱${discount.value.toLocaleString(undefined, {
                                                      minimumFractionDigits: 2,
                                                      maximumFractionDigits: 2
                                                  })}`}
                                        </span>
                                    </div>

                                    {/* Action Row */}
                                    <div className="flex items-center justify-between pt-3 border-t border-border/20">
                                        {canUpdate ? (
                                            <div className="flex items-center gap-2">
                                                <Switch
                                                    checked={discount.isActive}
                                                    onCheckedChange={() => handleToggleActive(discount)}
                                                    size="sm"
                                                    title={discount.isActive ? 'Deactivate Discount' : 'Activate Discount'}
                                                />
                                                <span className="text-xs text-muted-foreground font-semibold">
                                                    {discount.isActive ? 'Active' : 'Disabled'}
                                                </span>
                                            </div>
                                        ) : (
                                            <div />
                                        )}

                                        <div className="flex items-center gap-1.5">
                                            {canUpdate && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="size-7 text-muted-foreground hover:text-primary transition-colors"
                                                    onClick={() => handleEdit(discount)}
                                                    title="Edit configuration"
                                                >
                                                    <Edit className="size-3.5" />
                                                    <span className="sr-only">Edit</span>
                                                </Button>
                                            )}

                                            {canDelete && (
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="size-7 text-muted-foreground hover:text-destructive transition-colors"
                                                            title="Delete discount"
                                                        >
                                                            <Trash2 className="size-3.5" />
                                                            <span className="sr-only">Delete</span>
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle className="flex items-center gap-2 font-bold text-foreground">
                                                                <Trash2 className="size-5 text-destructive" />
                                                                Delete Discount Configuration
                                                            </AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Are you sure you want to delete the discount configuration for{' '}
                                                                <strong>"{discount.name}"</strong>? This action soft-deletes the setting; it will no
                                                                longer be selectable at checkout.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel className="h-9">Cancel</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={() => deleteMutation.mutate(discount.id)}
                                                                className="h-9 bg-destructive hover:bg-destructive/95 text-destructive-foreground shadow-sm"
                                                            >
                                                                Confirm Delete
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            <DiscountDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} discount={selectedDiscount} />
        </div>
    );
}
