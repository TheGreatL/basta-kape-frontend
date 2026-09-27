import { Eye, CheckCircle, FileCheck, Send, RotateCcw, Pencil, XCircle } from 'lucide-react';

import { Button } from '#/components/ui/button.tsx';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '#/components/ui/tooltip.tsx';
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
import { RequirePermission } from '#/components/rbac/require-permission.tsx';
import type { IPurchaseOrder } from '#/api/purchase-orders.api.ts';

interface PurchaseOrderRowActionsProps {
    po: IPurchaseOrder;
    onInspect: (po: IPurchaseOrder) => void;
    onReceive: (po: IPurchaseOrder) => void;
    onEdit: (id: string) => void;
    onUpdateStatus: (params: { id: string; status: 'DRAFT' | 'FINAL_DRAFT' | 'SENT' | 'RECEIVED' | 'CANCELLED' }) => void;
    isUpdatingStatus?: boolean;
}

export default function PurchaseOrderRowActions({
    po,
    onInspect,
    onReceive,
    onEdit,
    onUpdateStatus,
    isUpdatingStatus = false
}: PurchaseOrderRowActionsProps) {
    return (
        <TooltipProvider>
            <div className="flex items-center gap-1">
                {/* Inspect Details Button */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-muted-foreground hover:text-primary transition-colors"
                            onClick={() => onInspect(po)}
                        >
                            <Eye className="size-4" />
                            <span className="sr-only">Inspect Details</span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">Inspect Details</TooltipContent>
                </Tooltip>

                {/* Mark as Received / Receive Delivery (SENT or PARTIALLY_RECEIVED) */}
                {(po.status === 'SENT' || po.status === 'PARTIALLY_RECEIVED') && (
                    <RequirePermission module="Purchase Orders Management" action="update">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-8 text-muted-foreground hover:text-primary transition-colors"
                                    onClick={() => onReceive(po)}
                                >
                                    <CheckCircle className="size-4" />
                                    <span className="sr-only">Receive Delivery</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">Receive Delivery</TooltipContent>
                        </Tooltip>
                    </RequirePermission>
                )}

                {/* Mark as Final Draft (DRAFT only) */}
                {po.status === 'DRAFT' && (
                    <RequirePermission module="Purchase Orders Management" action="update">
                        <AlertDialog>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="size-8 text-muted-foreground hover:text-primary transition-colors"
                                            disabled={isUpdatingStatus}
                                        >
                                            <FileCheck className="size-4" />
                                            <span className="sr-only">Mark as Final Draft</span>
                                        </Button>
                                    </AlertDialogTrigger>
                                </TooltipTrigger>
                                <TooltipContent side="top">Mark as Final Draft</TooltipContent>
                            </Tooltip>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="font-bold text-foreground">Mark Purchase Order as Final Draft</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Are you sure you want to mark purchase order{' '}
                                        <strong className="font-mono text-foreground">{po.poNumber}</strong> as Final Draft? This marks the order as
                                        reviewed and ready to send to the supplier.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel className="h-9">Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                        className="h-9 bg-primary text-primary-foreground hover:bg-primary/95"
                                        onClick={() => onUpdateStatus({ id: po.id, status: 'FINAL_DRAFT' })}
                                    >
                                        Mark as Final Draft
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </RequirePermission>
                )}

                {/* Mark as Sent (FINAL_DRAFT only) */}
                {po.status === 'FINAL_DRAFT' && (
                    <RequirePermission module="Purchase Orders Management" action="update">
                        <AlertDialog>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="size-8 text-muted-foreground hover:text-primary transition-colors"
                                            disabled={isUpdatingStatus}
                                        >
                                            <Send className="size-4" />
                                            <span className="sr-only">Mark as Sent</span>
                                        </Button>
                                    </AlertDialogTrigger>
                                </TooltipTrigger>
                                <TooltipContent side="top">Mark as Sent</TooltipContent>
                            </Tooltip>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="font-bold text-foreground">Mark Purchase Order as Sent</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Are you sure you want to mark purchase order{' '}
                                        <strong className="font-mono text-foreground">{po.poNumber}</strong> as sent? This will change its status to
                                        SENT.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel className="h-9">Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                        className="h-9 bg-primary text-primary-foreground hover:bg-primary/95"
                                        onClick={() => onUpdateStatus({ id: po.id, status: 'SENT' })}
                                    >
                                        Mark as Sent
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </RequirePermission>
                )}

                {/* Revert to Draft (FINAL_DRAFT only) */}
                {po.status === 'FINAL_DRAFT' && (
                    <RequirePermission module="Purchase Orders Management" action="update">
                        <AlertDialog>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="size-8 text-muted-foreground hover:text-primary transition-colors"
                                            disabled={isUpdatingStatus}
                                        >
                                            <RotateCcw className="size-4" />
                                            <span className="sr-only">Revert to Draft</span>
                                        </Button>
                                    </AlertDialogTrigger>
                                </TooltipTrigger>
                                <TooltipContent side="top">Revert to Draft</TooltipContent>
                            </Tooltip>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="font-bold text-foreground">Revert Purchase Order to Draft</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Are you sure you want to revert purchase order{' '}
                                        <strong className="font-mono text-foreground">{po.poNumber}</strong> back to Draft status for revisions?
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel className="h-9">Cancel</AlertDialogCancel>
                                    <AlertDialogAction className="h-9" onClick={() => onUpdateStatus({ id: po.id, status: 'DRAFT' })}>
                                        Revert to Draft
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </RequirePermission>
                )}

                {/* Edit PO (DRAFT or FINAL_DRAFT) */}
                {(po.status === 'DRAFT' || po.status === 'FINAL_DRAFT') && (
                    <RequirePermission module="Purchase Orders Management" action="update">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-8 text-muted-foreground hover:text-primary transition-colors"
                                    onClick={() => onEdit(po.id)}
                                >
                                    <Pencil className="size-4 animate-in duration-100" />
                                    <span className="sr-only">Edit PO</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">{po.status === 'FINAL_DRAFT' ? 'Edit Final Draft PO' : 'Edit Draft PO'}</TooltipContent>
                        </Tooltip>
                    </RequirePermission>
                )}

                {/* Cancel PO (DRAFT, FINAL_DRAFT, or SENT) */}
                {(po.status === 'DRAFT' || po.status === 'FINAL_DRAFT' || po.status === 'SENT') && (
                    <RequirePermission module="Purchase Orders Management" action="update">
                        <AlertDialog>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="size-8 text-muted-foreground hover:text-primary transition-colors"
                                            disabled={isUpdatingStatus}
                                        >
                                            <XCircle className="size-4" />
                                            <span className="sr-only">Cancel PO</span>
                                        </Button>
                                    </AlertDialogTrigger>
                                </TooltipTrigger>
                                <TooltipContent side="top">Cancel PO</TooltipContent>
                            </Tooltip>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="font-bold text-foreground">Cancel Purchase Order</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Are you sure you want to cancel purchase order{' '}
                                        <strong className="font-mono text-foreground">{po.poNumber}</strong>? This action is permanent and cannot be
                                        undone.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel className="h-9">Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                        className="h-9 bg-destructive text-destructive-foreground hover:bg-destructive/95"
                                        onClick={() => onUpdateStatus({ id: po.id, status: 'CANCELLED' })}
                                    >
                                        Cancel PO
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </RequirePermission>
                )}
            </div>
        </TooltipProvider>
    );
}
