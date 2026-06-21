import * as React from 'react';
import { Coins, Wallet, Landmark, CreditCard, Check, Info, Upload, X } from 'lucide-react';
import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Badge } from '#/components/ui/badge.tsx';
import { Spinner } from '#/components/ui/spinner.tsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/select.tsx';
import { uploadImageFile } from '#/api/transactions.api.ts';
import { getFileUrl } from '#/utils/helper.ts';
import { toast } from 'sonner';
import type { IDiscount } from '../../store-settings/discounts.types';

interface CheckoutPaymentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    cartNetTotal: number;
    cart: any[];
    membersData: any;
    customerType: 'GUEST' | 'MEMBER';
    setCustomerType: (type: 'GUEST' | 'MEMBER') => void;
    guestName: string;
    setGuestName: (name: string) => void;
    selectedCustomerId: string;
    setSelectedCustomerId: (id: string) => void;
    buzzerId: string;
    setBuzzerId: (id: string) => void;
    orderType: 'DINE_IN' | 'TAKE_OUT' | 'DELIVERY';
    setOrderType: (type: 'DINE_IN' | 'TAKE_OUT' | 'DELIVERY') => void;
    paymentMethod: 'CASH' | 'GCASH' | 'PAYMAYA' | 'CREDIT_CARD';
    setPaymentMethod: (method: 'CASH' | 'GCASH' | 'PAYMAYA' | 'CREDIT_CARD') => void;
    cashTendered: number | '';
    setCashTendered: (cash: number | '') => void;
    referenceNumber: string;
    setReferenceNumber: (ref: string) => void;
    appliedDiscount: IDiscount | null;
    discountRefId: string;
    setDiscountRefId: (id: string) => void;
    discountRefName: string;
    setDiscountRefName: (name: string) => void;
    isPending: boolean;
    onSubmit: () => void;
    paymentProofPhoto: string;
    setPaymentProofPhoto: (photo: string) => void;
}

export default function CheckoutPaymentDialog({
    open,
    onOpenChange,
    cartNetTotal,
    cart,
    membersData,
    customerType,
    setCustomerType,
    guestName,
    setGuestName,
    selectedCustomerId,
    setSelectedCustomerId,
    buzzerId,
    setBuzzerId,
    orderType,
    setOrderType,
    paymentMethod,
    setPaymentMethod,
    cashTendered,
    setCashTendered,
    referenceNumber,
    setReferenceNumber,
    appliedDiscount,
    discountRefId,
    setDiscountRefId,
    discountRefName,
    setDiscountRefName,
    isPending,
    onSubmit,
    paymentProofPhoto,
    setPaymentProofPhoto
}: CheckoutPaymentDialogProps) {
    const totalItems = cart.reduce((sum, i) => sum + i.quantity, 0);

    const changeDue = React.useMemo(() => {
        if (paymentMethod !== 'CASH' || !cashTendered) return 0;
        const diff = Number(cashTendered) - cartNetTotal;
        return diff > 0 ? Math.round(diff * 100) / 100 : 0;
    }, [paymentMethod, cashTendered, cartNetTotal]);

    const [isUploading, setIsUploading] = React.useState(false);
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const result = await uploadImageFile(file);
            setPaymentProofPhoto(result.url);
            toast.success('Payment proof uploaded successfully.');
        } catch (err: any) {
            toast.error('Failed to upload image', {
                description: err?.message || 'Something went wrong.'
            });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg bg-background border-border/60 rounded-2xl p-0 overflow-hidden shadow-2xl">
                <DialogHeader className="px-6 pt-6 pb-2 border-b border-border/40 shrink-0">
                    <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
                        <Coins className="size-5 text-primary" />
                        Finalize Order Checkout
                    </DialogTitle>
                    <DialogDescription className="text-xs">Select payment settlement channels and capture buyer profile fields.</DialogDescription>
                </DialogHeader>

                <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto text-left">
                    {/* Order Net Total Display */}
                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-3.5 flex justify-between items-center">
                        <div>
                            <span className="text-xs text-muted-foreground font-bold block uppercase">Net Amount Due</span>
                            <span className="text-xl font-bold text-foreground font-mono">
                                ₱{cartNetTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                        <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-bold px-2 py-0.5">{totalItems} Items</Badge>
                    </div>

                    {/* Customer Info Form */}
                    <div className="space-y-3.5 p-3 rounded-xl border border-border/40 bg-muted/5">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-foreground/80 uppercase">Customer Profile Type</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setCustomerType('GUEST')}
                                    className={`py-1.5 px-3 rounded-lg border text-xs font-semibold text-center transition-all cursor-pointer ${
                                        customerType === 'GUEST'
                                            ? 'bg-primary/10 border-primary text-primary font-bold shadow-3xs'
                                            : 'bg-background hover:bg-muted/10 border-border text-muted-foreground'
                                    }`}
                                >
                                    Walk-In / Guest
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCustomerType('MEMBER')}
                                    className={`py-1.5 px-3 rounded-lg border text-xs font-semibold text-center transition-all cursor-pointer ${
                                        customerType === 'MEMBER'
                                            ? 'bg-primary/10 border-primary text-primary font-bold shadow-3xs'
                                            : 'bg-background hover:bg-muted/10 border-border text-muted-foreground'
                                    }`}
                                >
                                    Store Member
                                </button>
                            </div>
                        </div>

                        {customerType === 'GUEST' ? (
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-foreground/80 uppercase">Guest Name</label>
                                <Input
                                    placeholder="e.g. Walk-in Customer, Sencio..."
                                    value={guestName}
                                    onChange={(e) => setGuestName(e.target.value)}
                                    className="h-8.5 text-xs bg-background"
                                />
                            </div>
                        ) : (
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-foreground/80 uppercase flex items-center gap-1">
                                    Select Member Account <span className="text-destructive">*</span>
                                </label>
                                <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                                    <SelectTrigger className="h-8.5 text-xs bg-background">
                                        <SelectValue placeholder="Search member profile..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {membersData?.data && membersData.data.length > 0 ? (
                                            membersData.data.map((member: any) => (
                                                <SelectItem key={member.id} value={member.id} className="text-xs">
                                                    {member.user.firstName} {member.user.lastName} ({member.user.phone || 'No phone'})
                                                </SelectItem>
                                            ))
                                        ) : (
                                            <SelectItem value="none" disabled className="text-xs">
                                                No registered store members
                                            </SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3 pt-1 border-t border-border/20">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-foreground/80 uppercase">Fulfillment Mode</label>
                                <Select value={orderType} onValueChange={(v: any) => setOrderType(v)}>
                                    <SelectTrigger className="h-8.5 text-xs bg-background">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="DINE_IN" className="text-xs">
                                            Dine-In
                                        </SelectItem>
                                        <SelectItem value="TAKE_OUT" className="text-xs">
                                            Take-Out / Pickup
                                        </SelectItem>
                                        <SelectItem value="DELIVERY" className="text-xs">
                                            Store Delivery
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-foreground/80 uppercase">Table / Buzzer Pager</label>
                                <Input
                                    placeholder="e.g. Buzzer ID 05"
                                    value={buzzerId}
                                    onChange={(e) => setBuzzerId(e.target.value)}
                                    className="h-8.5 text-xs bg-background"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Special Discount Ref Code if senior/pwd applied */}
                    {appliedDiscount && (discountRefName || discountRefId) && (
                        <div className="space-y-2 border border-primary/20 bg-primary/5 rounded-xl p-3 text-xs leading-normal">
                            <h5 className="font-bold text-primary flex items-center gap-1.5 uppercase text-xs">
                                <Info className="size-3.5" />
                                Verify Discount Credentials
                            </h5>
                            <div className="grid grid-cols-2 gap-2 mt-1">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase">Reference ID / License No.</label>
                                    <Input
                                        placeholder="Senior/PWD Card ID..."
                                        value={discountRefId}
                                        onChange={(e) => setDiscountRefId(e.target.value)}
                                        className="h-7 text-xs bg-background"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase">Cardholder Registered Name</label>
                                    <Input
                                        placeholder="Full Customer Name..."
                                        value={discountRefName}
                                        onChange={(e) => setDiscountRefName(e.target.value)}
                                        className="h-7 text-xs bg-background"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Payment Settlement Methods */}
                    <div className="space-y-3.5 pt-2 border-t border-border/20">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-foreground/80 uppercase">Settlement Channel</label>
                            <div className="grid grid-cols-4 gap-2">
                                {[
                                    { id: 'CASH', label: 'Cash', icon: Coins },
                                    { id: 'GCASH', label: 'GCash', icon: Wallet },
                                    { id: 'PAYMAYA', label: 'Maya', icon: Landmark },
                                    { id: 'CREDIT_CARD', label: 'Card', icon: CreditCard }
                                ].map((method) => {
                                    const Icon = method.icon;
                                    const isSelected = paymentMethod === method.id;
                                    return (
                                        <button
                                            key={method.id}
                                            type="button"
                                            onClick={() => {
                                                setPaymentMethod(method.id as any);
                                                setCashTendered('');
                                            }}
                                            className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all cursor-pointer ${
                                                isSelected
                                                    ? 'bg-primary/10 border-primary text-primary font-bold shadow-3xs'
                                                    : 'bg-background hover:bg-muted/10 border-border/60 text-muted-foreground hover:text-foreground'
                                            }`}
                                        >
                                            <Icon className="size-4 mb-1 text-muted-foreground group-hover:text-foreground" />
                                            <span className="text-xs">{method.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* CASH DETAILS */}
                        {paymentMethod === 'CASH' && (
                            <div className="space-y-3.5 p-3 rounded-xl border border-emerald-500/15 bg-emerald-500/5 animate-fade-in">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-emerald-800 uppercase flex items-center gap-1">
                                        Tendered Cash Amount (₱) <span className="text-destructive">*</span>
                                    </label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        placeholder="Enter cash received..."
                                        value={cashTendered}
                                        onChange={(e) => setCashTendered(e.target.value === '' ? '' : Number(e.target.value))}
                                        className="h-9 text-xs bg-background font-bold font-mono border-emerald-500/20"
                                    />
                                </div>
                                {/* Fast Denomination Numpad Shortcut buttons */}
                                <div className="flex flex-wrap gap-1.5 pt-0.5">
                                    {[cartNetTotal, 50, 100, 200, 500, 1000].map((denom) => {
                                        const value = Math.ceil(denom);
                                        if (value < cartNetTotal) return null;
                                        const label = value === Math.ceil(cartNetTotal) ? 'Exact Total' : `₱${value}`;
                                        return (
                                            <button
                                                key={denom}
                                                type="button"
                                                onClick={() => setCashTendered(value)}
                                                className="text-2xs font-semibold py-1 px-2.5 rounded-lg border border-emerald-500/25 text-emerald-800 hover:bg-emerald-500/10 cursor-pointer bg-background"
                                            >
                                                {label}
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="flex justify-between items-center text-xs pt-1.5 border-t border-emerald-500/10">
                                    <span className="text-emerald-700 font-semibold uppercase text-xs">Change Due to Customer</span>
                                    <span className="text-sm font-bold text-emerald-600 font-mono">
                                        ₱{changeDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* DIGITAL REFERENCE & PROOF UPLOAD */}
                        {paymentMethod !== 'CASH' && (
                            <div className="space-y-3.5 p-3 rounded-xl border border-primary/15 bg-primary/5 animate-fade-in">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-primary uppercase flex items-center gap-1">
                                        Digital Payment Reference ID <span className="text-destructive">*</span>
                                    </label>
                                    <Input
                                        placeholder="GCash or Card reference number..."
                                        value={referenceNumber}
                                        onChange={(e) => setReferenceNumber(e.target.value)}
                                        className="h-8.5 text-xs bg-background font-mono border-primary/20"
                                    />
                                    <span className="text-xs text-muted-foreground block mt-1 leading-tight">
                                        Provide the reference number printed on the customer's payment screen.
                                    </span>
                                </div>

                                <div className="space-y-1.5 pt-2 border-t border-primary/10">
                                    <label className="text-xs font-bold text-primary uppercase block">Payment Proof Receipt / Screenshot</label>

                                    {paymentProofPhoto ? (
                                        <div className="relative rounded-lg border border-border bg-background p-2 flex items-center gap-3">
                                            <div className="size-12 rounded bg-muted overflow-hidden flex items-center justify-center border shrink-0">
                                                <img
                                                    src={paymentProofPhoto.startsWith('http') ? paymentProofPhoto : getFileUrl(paymentProofPhoto)}
                                                    alt="Receipt Proof"
                                                    className="size-full object-cover"
                                                />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <span className="text-2xs font-semibold text-foreground block truncate">
                                                    Proof Screenshot Uploaded
                                                </span>
                                                <span className="text-3xs text-muted-foreground font-mono truncate block">
                                                    {paymentProofPhoto.split('/').pop() || 'screenshot.png'}
                                                </span>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setPaymentProofPhoto('')}
                                                className="size-7 hover:bg-destructive/10 hover:text-destructive text-muted-foreground rounded-lg"
                                            >
                                                <X className="size-3.5" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center p-4 border border-dashed border-primary/30 rounded-lg bg-background hover:bg-muted/5 transition-all">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                ref={fileInputRef}
                                                onChange={handleFileChange}
                                                className="hidden"
                                                disabled={isUploading}
                                            />
                                            {isUploading ? (
                                                <div className="flex flex-col items-center gap-1.5 py-1">
                                                    <Spinner className="size-4.5 text-primary animate-spin" />
                                                    <span className="text-3xs font-semibold text-muted-foreground">Uploading receipt photo...</span>
                                                </div>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="flex flex-col items-center gap-1 cursor-pointer text-center bg-transparent border-0 p-0"
                                                >
                                                    <Upload className="size-5 text-primary/70" />
                                                    <span className="text-2xs font-bold text-primary">Upload Proof Image</span>
                                                    <span className="text-3xs text-muted-foreground">PNG, JPG or WEBP (Max 5MB)</span>
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="px-6 py-3 border-t bg-muted/20 shrink-0">
                    <Button variant="ghost" onClick={() => onOpenChange(false)} className="h-8.5 text-xs font-semibold">
                        Cancel
                    </Button>
                    <Button
                        onClick={onSubmit}
                        disabled={
                            isPending ||
                            (paymentMethod === 'CASH' && (cashTendered === '' || cashTendered < cartNetTotal)) ||
                            (paymentMethod !== 'CASH' && !referenceNumber.trim())
                        }
                        className="h-8.5 text-xs font-bold px-5 bg-primary text-primary-foreground shadow-xs gap-1"
                    >
                        {isPending ? (
                            <>
                                <Spinner className="size-3.5 animate-spin" />
                                Posting...
                            </>
                        ) : (
                            <>
                                <Check className="size-3.5" />
                                Submit Checkout & Print
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
