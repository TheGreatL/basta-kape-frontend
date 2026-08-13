import { format } from 'date-fns';
import { Truck, Calendar, User, PackageCheck, AlertTriangle, ShieldCheck, DollarSign, Tag } from 'lucide-react';

import type { IDelivery } from '../inventory.types';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog.tsx';
import { Badge } from '#/components/ui/badge.tsx';
import { Button } from '#/components/ui/button.tsx';

interface DeliveryViewDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    delivery: IDelivery | null;
    onEdit?: () => void;
}

export default function DeliveryViewDialog({ open, onOpenChange, delivery, onEdit }: DeliveryViewDialogProps) {
    if (!delivery) return null;

    const unitStr = delivery.ingredient?.defaultUnit
        ? ` ${delivery.ingredient.defaultUnit.abbreviation || delivery.ingredient.defaultUnit.name}`
        : '';

    const expiryDate = delivery.expiryDate ? new Date(delivery.expiryDate) : null;
    const now = new Date();
    const isExpired = expiryDate ? expiryDate < now : false;
    const isExpiringSoon = expiryDate ? expiryDate.getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000 && !isExpired : false;

    const percentRemaining = delivery.quantityReceived > 0 ? (delivery.currentQuantity / delivery.quantityReceived) * 100 : 0;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md max-h-[90vh] flex flex-col p-0 overflow-hidden bg-background">
                <DialogHeader className="px-6 pt-6 pb-4 border-b bg-muted/20">
                    <div className="flex items-center justify-between gap-2 pr-6">
                        <div className="flex items-center gap-2">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                                <Truck className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <DialogTitle className="text-lg font-bold text-foreground">Delivery Record Details</DialogTitle>
                                <DialogDescription className="text-xs">
                                    Lot / Batch: <span className="font-mono font-semibold text-foreground">{delivery.batchNumber || 'N/A'}</span>
                                </DialogDescription>
                            </div>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                    {/* Ingredient & Supplier Banner */}
                    <div className="rounded-lg border bg-card p-3.5 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Raw Ingredient</span>
                            <Badge variant="secondary" className="text-xs font-semibold">
                                {delivery.ingredient?.type ? delivery.ingredient.type.replace('_', ' ') : 'INGREDIENT'}
                            </Badge>
                        </div>
                        <p className="text-base font-bold text-foreground">{delivery.ingredient?.name || '—'}</p>
                        <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground border-t border-border/40">
                            <Tag className="size-3.5 text-primary" />
                            <span>Supplier:</span>
                            <span className="font-semibold text-foreground">{delivery.supplier?.name || 'Unassigned / Direct Purchase'}</span>
                        </div>
                    </div>

                    {/* Stock Metrics Grid */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-lg border bg-muted/20 p-3 space-y-1">
                            <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                                <PackageCheck className="size-3 text-emerald-600" /> Qty Received
                            </span>
                            <p className="text-lg font-bold text-emerald-600">
                                +{delivery.quantityReceived.toLocaleString()}
                                <span className="text-xs font-normal text-muted-foreground">{unitStr}</span>
                            </p>
                        </div>

                        <div className="rounded-lg border bg-muted/20 p-3 space-y-1">
                            <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                                <ShieldCheck className="size-3 text-primary" /> Remaining Stock
                            </span>
                            <p className="text-lg font-bold text-foreground">
                                {delivery.currentQuantity.toLocaleString()}
                                <span className="text-xs font-normal text-muted-foreground">{unitStr}</span>
                            </p>
                            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden mt-1">
                                <div
                                    className={`h-full transition-all ${
                                        percentRemaining === 0
                                            ? 'bg-muted-foreground/30'
                                            : percentRemaining <= 25
                                              ? 'bg-rose-500'
                                              : percentRemaining <= 50
                                                ? 'bg-amber-500'
                                                : 'bg-emerald-500'
                                    }`}
                                    style={{ width: `${Math.min(100, percentRemaining)}%` }}
                                />
                            </div>
                        </div>

                        <div className="rounded-lg border bg-muted/20 p-3 space-y-1">
                            <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                                <DollarSign className="size-3 text-primary" /> Unit Cost
                            </span>
                            <p className="text-base font-bold text-foreground">₱{delivery.unitCost.toFixed(2)}</p>
                        </div>

                        <div className="rounded-lg border bg-muted/20 p-3 space-y-1">
                            <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                                <DollarSign className="size-3 text-primary" /> Total Cost
                            </span>
                            <p className="text-base font-bold text-foreground">₱{delivery.totalCost.toFixed(2)}</p>
                        </div>
                    </div>

                    {/* Expiration Status Card */}
                    <div className="rounded-lg border bg-card p-3 space-y-1.5">
                        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                            <Calendar className="size-3.5" /> Expiration Date
                        </span>
                        {expiryDate ? (
                            <div className="flex items-center justify-between pt-0.5">
                                <span className="text-sm font-semibold text-foreground">{format(expiryDate, 'MMMM d, yyyy')}</span>
                                {isExpired ? (
                                    <Badge variant="destructive" className="gap-1 text-[11px]">
                                        <AlertTriangle className="size-3" /> Expired
                                    </Badge>
                                ) : isExpiringSoon ? (
                                    <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 gap-1 text-[11px]">
                                        <AlertTriangle className="size-3" /> Expiring Soon
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="text-[11px] font-semibold text-emerald-600 border-emerald-500/30">
                                        Active / Safe
                                    </Badge>
                                )}
                            </div>
                        ) : (
                            <p className="text-xs text-muted-foreground italic">No expiration date set for this batch.</p>
                        )}
                    </div>

                    {/* Audit Trail Card */}
                    <div className="rounded-lg border bg-muted/30 p-3.5 space-y-2.5">
                        <h4 className="text-xs font-semibold text-foreground/90 uppercase tracking-wider">Audit Information</h4>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="space-y-0.5">
                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                    <User className="size-3" /> Logged By
                                </span>
                                <p className="font-semibold text-foreground">
                                    {delivery.createdBy ? `${delivery.createdBy.firstName} ${delivery.createdBy.lastName}` : 'System'}
                                </p>
                                {delivery.receivedAt && (
                                    <p className="text-[10px] text-muted-foreground">{format(new Date(delivery.receivedAt), 'MMM d, yyyy HH:mm')}</p>
                                )}
                            </div>

                            <div className="space-y-0.5">
                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                    <User className="size-3" /> Last Editor
                                </span>
                                <p className="font-semibold text-foreground">
                                    {delivery.updatedBy ? `${delivery.updatedBy.firstName} ${delivery.updatedBy.lastName}` : '—'}
                                </p>
                                {delivery.updatedAt ? (
                                    <p className="text-[10px] text-muted-foreground">{format(new Date(delivery.updatedAt), 'MMM d, yyyy HH:mm')}</p>
                                ) : (
                                    <p className="text-[10px] text-muted-foreground">Never modified</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="px-6 py-3 border-t bg-muted/20 flex items-center justify-between">
                    <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="h-8 text-xs">
                        Close
                    </Button>
                    {onEdit && (
                        <Button
                            size="sm"
                            onClick={() => {
                                onOpenChange(false);
                                onEdit();
                            }}
                            className="h-8 text-xs gap-1.5"
                        >
                            Edit Record
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
