import * as React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Truck, MapPin, Phone, ExternalLink, Navigation, CheckCircle2, Loader2, User } from 'lucide-react';
import { toast } from 'sonner';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '#/components/ui/dialog.tsx';
import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/select.tsx';
import { CopyButton } from '#/components/ui/copy-button.tsx';
import { updateOrderCourier } from '#/api/orders.api.ts';
import { getErrorMessage } from '#/utils/error-handler.ts';
import { formatCurrency } from '#/utils/helper.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import type { IOrder, TRiderVehicle } from '../order.types.ts';
import { RIDER_VEHICLES } from '../order.types.ts';

interface AssignCourierDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    order: IOrder | null;
    onSuccess?: () => void;
}

export default function AssignCourierDialog({ open, onOpenChange, order, onSuccess }: AssignCourierDialogProps) {
    const queryClient = useQueryClient();

    const [riderName, setRiderName] = React.useState('');
    const [riderPlate, setRiderPlate] = React.useState('');
    const [riderVehicle, setRiderVehicle] = React.useState<TRiderVehicle>('Motorcycle');
    const [trackingLink, setTrackingLink] = React.useState('');

    // Pre-populate fields if courier details exist
    React.useEffect(() => {
        if (order) {
            setRiderName(order.riderName || '');
            setRiderPlate(order.riderPlate || '');
            if (order.riderVehicle && RIDER_VEHICLES.includes(order.riderVehicle as TRiderVehicle)) {
                setRiderVehicle(order.riderVehicle as TRiderVehicle);
            } else {
                setRiderVehicle('Motorcycle');
            }
            setTrackingLink(order.trackingLink || '');
        }
    }, [order]);

    // Extract contact phone from order notes if present
    const contactPhone = React.useMemo(() => {
        if (!order?.notes) return '';
        const match = order.notes.match(/Contact Phone:\s*([^\n\r]+)/i);
        return match ? match[1].trim() : '';
    }, [order?.notes]);

    const courierMutation = useMutation({
        mutationFn: (payload: { riderName: string; riderPlate: string; riderVehicle: TRiderVehicle; trackingLink: string }) => {
            if (!order) throw new Error('No order selected');
            return updateOrderCourier(order.id, payload);
        },
        onSuccess: (updatedOrder) => {
            toast.success('Courier Assigned Successfully', {
                description: `Order ${updatedOrder.queueNumber} courier details have been recorded.`
            });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.ORDERS.ORDERS_LIST] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.ORDERS.ORDER_DETAILS, order?.id] });
            onOpenChange(false);
            if (onSuccess) onSuccess();
        },
        onError: (err) => {
            toast.error('Failed to assign courier', {
                description: getErrorMessage(err)
            });
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!order) return;

        if (!riderName.trim() || !riderPlate.trim() || !trackingLink.trim()) {
            toast.error('Missing Courier Details', {
                description: 'Please provide rider name, vehicle plate, and live tracking link.'
            });
            return;
        }

        try {
            new URL(trackingLink.trim());
        } catch {
            toast.error('Invalid Tracking Link URL', {
                description: 'Please enter a valid link starting with http:// or https://'
            });
            return;
        }

        courierMutation.mutate({
            riderName: riderName.trim(),
            riderPlate: riderPlate.trim(),
            riderVehicle,
            trackingLink: trackingLink.trim()
        });
    };

    if (!order) return null;

    const hasCoordinates = order.deliveryLatitude !== null && order.deliveryLongitude !== null;
    const coordsString = hasCoordinates ? `${order.deliveryLatitude?.toFixed(5)}, ${order.deliveryLongitude?.toFixed(5)}` : '';
    const googleMapsUrl = hasCoordinates
        ? `https://www.google.com/maps/search/?api=1&query=${order.deliveryLatitude},${order.deliveryLongitude}`
        : '';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-6 rounded-2xl">
                <DialogHeader className="space-y-1">
                    <div className="flex items-center gap-2 text-primary">
                        <Truck className="size-5" />
                        <DialogTitle className="text-lg font-bold text-foreground">
                            {order.riderName ? 'Edit Delivery Courier' : 'Assign Delivery Courier'}
                        </DialogTitle>
                    </div>
                    <DialogDescription className="text-xs text-muted-foreground">
                        Order <strong className="text-foreground">{order.queueNumber}</strong> • {order.customerName || 'Customer'}
                    </DialogDescription>
                </DialogHeader>

                {/* Customer Delivery Information Dispatch Card */}
                <div className="p-4 rounded-xl bg-muted/30 border border-border/60 space-y-3 text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-border/40">
                        <span className="font-bold text-foreground flex items-center gap-1.5 uppercase text-[11px]">
                            <User className="size-3.5 text-primary" />
                            Customer Drop-Off Info
                        </span>
                        {order.deliveryDistanceKm && (
                            <span className="font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px]">
                                {order.deliveryDistanceKm.toFixed(1)} km away
                            </span>
                        )}
                    </div>

                    <div className="space-y-2">
                        {/* Address */}
                        <div className="space-y-0.5">
                            <span className="text-muted-foreground text-[11px] block font-semibold">Delivery Address</span>
                            <div className="flex items-start justify-between gap-2 p-2 rounded-lg bg-background/80 border border-border/40">
                                <span className="font-medium text-foreground leading-relaxed flex-1">
                                    {order.deliveryAddress || 'No address provided'}
                                </span>
                                {order.deliveryAddress && (
                                    <CopyButton value={order.deliveryAddress} description="Delivery address copied" className="size-7 shrink-0" />
                                )}
                            </div>
                        </div>

                        {/* Contact Phone & Coordinates row */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {/* Contact Phone */}
                            <div className="space-y-0.5">
                                <span className="text-muted-foreground text-[11px] block font-semibold flex items-center gap-1">
                                    <Phone className="size-3 text-muted-foreground" />
                                    Contact Phone
                                </span>
                                <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-background/80 border border-border/40">
                                    <span className="font-mono font-bold text-foreground">{contactPhone || '—'}</span>
                                    {contactPhone && (
                                        <CopyButton value={contactPhone} description="Phone number copied" className="size-7 shrink-0" />
                                    )}
                                </div>
                            </div>

                            {/* GPS Pin */}
                            <div className="space-y-0.5">
                                <span className="text-muted-foreground text-[11px] block font-semibold flex items-center gap-1">
                                    <Navigation className="size-3 text-muted-foreground" />
                                    GPS Pin
                                </span>
                                <div className="flex items-center justify-between gap-1.5 p-2 rounded-lg bg-background/80 border border-border/40">
                                    <span className="font-mono text-muted-foreground text-[11px] truncate">
                                        {coordsString || 'No GPS coordinates'}
                                    </span>
                                    <div className="flex items-center gap-1 shrink-0">
                                        {hasCoordinates && (
                                            <>
                                                <CopyButton value={coordsString} description="GPS coordinates copied" className="size-7" />
                                                <a
                                                    href={googleMapsUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="size-7 inline-flex items-center justify-center rounded-md hover:bg-accent/40 text-muted-foreground hover:text-foreground"
                                                    title="Open in Google Maps"
                                                >
                                                    <ExternalLink className="size-3.5" />
                                                </a>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Shipping Fee Collected */}
                        {order.deliveryFee !== null && order.deliveryFee !== undefined && (
                            <div className="flex justify-between items-center pt-1 text-[11px] font-semibold text-muted-foreground">
                                <span>Collected Shipping Fee:</span>
                                <span className="font-bold text-foreground">{formatCurrency(order.deliveryFee)}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4 pt-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-foreground/80 block">
                                Rider Name <span className="text-rose-500">*</span>
                            </label>
                            <Input
                                placeholder="e.g. Juan Dela Cruz"
                                value={riderName}
                                onChange={(e) => setRiderName(e.target.value)}
                                maxLength={100}
                                className="h-9.5 text-xs rounded-xl bg-background border-border/60"
                                required
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-foreground/80 block">
                                Plate Number <span className="text-rose-500">*</span>
                            </label>
                            <Input
                                placeholder="e.g. ABC 1234"
                                value={riderPlate}
                                onChange={(e) => setRiderPlate(e.target.value.toUpperCase())}
                                maxLength={50}
                                className="h-9.5 text-xs rounded-xl bg-background border-border/60 font-mono uppercase"
                                required
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-foreground/80 block">
                                Vehicle Type <span className="text-rose-500">*</span>
                            </label>
                            <Select value={riderVehicle} onValueChange={(val) => setRiderVehicle(val as TRiderVehicle)}>
                                <SelectTrigger className="h-9.5 text-xs rounded-xl bg-background border-border/60">
                                    <SelectValue placeholder="Select vehicle type" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    {RIDER_VEHICLES.map((vehicle) => (
                                        <SelectItem key={vehicle} value={vehicle} className="text-xs">
                                            {vehicle}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-foreground/80 block">
                                Tracking Link URL <span className="text-rose-500">*</span>
                            </label>
                            <Input
                                type="url"
                                placeholder="https://..."
                                value={trackingLink}
                                onChange={(e) => setTrackingLink(e.target.value)}
                                maxLength={1000}
                                className="h-9.5 text-xs rounded-xl bg-background border-border/60"
                                required
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border/40">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={courierMutation.isPending}
                            className="h-9 px-4 text-xs font-semibold rounded-xl"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={courierMutation.isPending}
                            className="h-9 px-5 text-xs font-bold rounded-xl gap-1.5 bg-primary text-primary-foreground shadow-xs hover:shadow-md transition-all"
                        >
                            {courierMutation.isPending ? (
                                <>
                                    <Loader2 className="size-3.5 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="size-3.5" />
                                    Save Courier Details
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
