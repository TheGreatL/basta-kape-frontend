import * as React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Lock, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

import { useAuthStore } from '#/store/auth-store.ts';
import { getUserPermissions, hasPermission } from '#/utils/rbac.ts';
import { appModules, appPermissions } from '#/constants/rbac.ts';
import { voidOrder } from '#/api/orders.api.ts';
import { login } from '#/api/auth.api.ts';
import { getErrorMessage } from '#/utils/error-handler.ts';
import QUERY_KEY from '#/constants/query-keys.ts';

import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Textarea } from '#/components/ui/textarea.tsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog.tsx';
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert.tsx';
import { Spinner } from '#/components/ui/spinner.tsx';

interface VoidOrderDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    orderId: string | null;
    orderNumber: string | null;
    onSuccess?: () => void;
}

export default function VoidOrderDialog({ open, onOpenChange, orderId, orderNumber, onSuccess }: VoidOrderDialogProps) {
    const queryClient = useQueryClient();

    // Check currently logged-in user permissions
    const currentUser = useAuthStore((state) => state.user);
    const userPermissions = React.useMemo(() => getUserPermissions(currentUser), [currentUser]);
    const hasPosDelete = React.useMemo(() => hasPermission(userPermissions, appModules.POINT_OF_SALE, appPermissions.DELETE), [userPermissions]);

    // Form states
    const [reason, setReason] = React.useState('');
    const [username, setUsername] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    // Reset fields on modal open/close
    React.useEffect(() => {
        if (!open) {
            setReason('');
            setUsername('');
            setPassword('');
            setIsSubmitting(false);
        }
    }, [open]);

    // Mutation: Void the order
    const voidMutation = useMutation({
        mutationFn: ({ id, voidReason, token }: { id: string; voidReason: string; token?: string }) => voidOrder(id, { reason: voidReason }, token),
        onSuccess: () => {
            toast.success(`Order Voided successfully`, {
                description: `Order ${orderNumber || ''} is now cancelled.`
            });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.ORDERS.ORDERS_LIST] });
            if (orderId) {
                queryClient.invalidateQueries({ queryKey: [QUERY_KEY.ORDERS.ORDER_DETAILS, orderId] });
            }
            onOpenChange(false);
            if (onSuccess) onSuccess();
        },
        onError: (err) => {
            toast.error('Failed to void order', {
                description: getErrorMessage(err)
            });
        }
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!orderId) return;

        if (reason.trim().length < 3 || reason.trim().length > 1000) {
            toast.error('Invalid Reason', {
                description: 'Reason must be between 3 and 1000 characters.'
            });
            return;
        }

        setIsSubmitting(true);

        try {
            let tempToken: string | undefined;

            // Trigger override login if current cashier lacks POS delete permission
            if (!hasPosDelete) {
                if (!username.trim() || !password.trim()) {
                    toast.error('Authentication Required', {
                        description: 'Please input supervisor/manager override credentials.'
                    });
                    setIsSubmitting(false);
                    return;
                }

                // Call login API
                const authRes = await login({ identifier: username, password });
                const overridePermissions = getUserPermissions(authRes.user);
                const overrideHasDelete = hasPermission(overridePermissions, appModules.POINT_OF_SALE, appPermissions.DELETE);

                if (!overrideHasDelete) {
                    toast.error('Insufficient Override Privileges', {
                        description: 'The credentials supplied do not hold Delete permission on the POS module.'
                    });
                    setIsSubmitting(false);
                    return;
                }

                tempToken = authRes.accessToken;
            }

            // Perform voiding request
            await voidMutation.mutateAsync({
                id: orderId,
                voidReason: reason.trim(),
                token: tempToken
            });
        } catch (err) {
            toast.error('Override Authentication Failed', {
                description: getErrorMessage(err)
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md bg-background border-border/60 rounded-2xl overflow-hidden p-6 text-xs">
                <DialogHeader className="space-y-1">
                    <DialogTitle className="flex items-center gap-2 font-black text-foreground text-lg">
                        <AlertTriangle className="size-5 text-destructive animate-pulse-slow" />
                        Void Order Override
                    </DialogTitle>
                    <DialogDescription className="text-2xs text-muted-foreground">
                        This is a high-privilege loss prevention operation. Order status will transition to CANCELLED and inventory changes will
                        revert.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                    {/* Render Warning / Credentials form if override is required */}
                    {!hasPosDelete ? (
                        <div className="space-y-3">
                            <Alert variant="destructive" className="bg-destructive/5 border-destructive/20 text-destructive">
                                <ShieldAlert className="size-4 text-destructive" />
                                <AlertTitle className="font-bold text-2xs uppercase tracking-wide">Manager Override Required</AlertTitle>
                                <AlertDescription className="text-2xs leading-normal">
                                    Current session account does not hold Point of Sale Delete scope. Please authenticate a supervisor or manager to
                                    override this void transaction.
                                </AlertDescription>
                            </Alert>

                            <div className="grid grid-cols-2 gap-3.5">
                                <div className="space-y-1">
                                    <label className="font-bold text-foreground/80 flex items-center gap-1">
                                        <Lock className="size-3 text-muted-foreground" />
                                        Supervisor ID / Email
                                    </label>
                                    <Input
                                        placeholder="e.g. storemanager"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="h-8.5 bg-background/50 font-medium"
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="font-bold text-foreground/80 block">Password</label>
                                    <Input
                                        type="password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="h-8.5 bg-background/50"
                                        required
                                    />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <Alert className="bg-emerald-500/5 border-emerald-500/10 text-emerald-700">
                            <CheckCircle2 className="size-4 text-emerald-600" />
                            <AlertTitle className="font-bold text-2xs uppercase tracking-wide">Privilege Approved</AlertTitle>
                            <AlertDescription className="text-2xs leading-normal">
                                You hold the necessary authorization to perform this void override directly.
                            </AlertDescription>
                        </Alert>
                    )}

                    <div className="space-y-1">
                        <div className="flex justify-between items-center">
                            <label className="font-bold text-foreground/80">Stated Reason for Void</label>
                            <span
                                className={`text-2xs font-semibold ${reason.length < 3 || reason.length > 1000 ? 'text-amber-500' : 'text-muted-foreground'}`}
                            >
                                {reason.length}/1000
                            </span>
                        </div>
                        <Textarea
                            placeholder="e.g. Wrong items entered / Customer modified size before barista prep..."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={3}
                            className="bg-background/50 text-xs resize-none"
                            required
                        />
                    </div>

                    <DialogFooter className="gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-9">
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting || voidMutation.isPending}
                            variant="destructive"
                            className="h-9 font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-3xs"
                        >
                            {isSubmitting || voidMutation.isPending ? (
                                <>
                                    <Spinner className="size-3.5 animate-spin mr-1.5" />
                                    Authorizing...
                                </>
                            ) : (
                                'Void Order'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

// Simple dummy CheckCircle2 fallback if not found in Lucide
function CheckCircle2(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            {...props}
        >
            <circle cx="12" cy="12" r="10" />
            <path d="m9 12 2 2 4-4" />
        </svg>
    );
}
