import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Shield } from 'lucide-react';

import { getModulesPermissions, getRoleByName } from '#/api/rbac.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import type { IRoleListItem } from '../rbac.types';

import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog.tsx';
import { Spinner } from '#/components/ui/spinner.tsx';
import { RolePermissionTree } from './components/role-permission-tree.tsx';
import { RoleAuditCard } from './components/role-audit-card.tsx';
import { Label } from '#/components/ui/label.tsx';

interface RoleViewDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    role: IRoleListItem | null;
}

export default function RoleViewDialog({ open, onOpenChange, role }: RoleViewDialogProps) {
    const [isRendering, setIsRendering] = React.useState(false);

    React.useEffect(() => {
        if (open) {
            const timer = setTimeout(() => setIsRendering(true), 50);
            return () => clearTimeout(timer);
        } else {
            setIsRendering(false);
        }
    }, [open]);

    const { data: treeData, isLoading: isTreeLoading } = useQuery({
        queryKey: [QUERY_KEY.RBAC.MODULES_PERMISSIONS],
        queryFn: getModulesPermissions,
        enabled: open
    });

    const { data: roleDetails, isLoading: isRoleDetailsLoading } = useQuery({
        queryKey: [QUERY_KEY.RBAC.ROLE_DETAILS, role?.name],
        queryFn: () => getRoleByName(role!.name),
        enabled: open && !!role?.name
    });

    const isLoading = isTreeLoading || isRoleDetailsLoading || !isRendering;

    const currentPermissions = React.useMemo(() => {
        if (!roleDetails) return [];
        return roleDetails.rolePermissions.map((rp: any) => ({
            modulePermissionId: rp.modulePermission.id,
            scope: rp.modulePermission.accessScope
        }));
    }, [roleDetails]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden bg-background">
                <DialogHeader className="px-6 pt-6 pb-2">
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                        <Shield className="size-5 text-primary" />
                        View Role: {role?.name}
                    </DialogTitle>
                    <DialogDescription className="text-xs">Detailed operational security scope mapping for this role.</DialogDescription>
                </DialogHeader>

                {roleDetails && <RoleAuditCard role={roleDetails} />}

                <div className="flex-1 overflow-y-auto px-6 py-2 space-y-4 min-h-0">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-24 gap-3">
                            <Spinner className="h-6 w-6 text-primary animate-spin" />
                            <span className="text-xs text-muted-foreground font-medium">Loading role configurations...</span>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="font-semibold text-foreground/80">Role Name</Label>
                                    <Input disabled value={roleDetails?.name || ''} className="h-9 bg-background/50" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="font-semibold text-foreground/80">Description</Label>
                                    <Input disabled value={roleDetails?.description || 'No description provided.'} className="h-9 bg-background/50" />
                                </div>
                            </div>
                            <div className="space-y-3 pt-2">
                                <div className="flex items-center justify-between border-b pb-2">
                                    <h3 className="text-sm font-bold text-foreground/80">Access Control Selection Tree</h3>
                                    <span className="text-xs text-muted-foreground font-medium">
                                        Toggle permissions and adjust access scope limits.
                                    </span>
                                </div>
                                <RolePermissionTree treeData={treeData} currentPermissions={currentPermissions} readOnly={true} />
                            </div>
                        </>
                    )}
                </div>

                <DialogFooter className="px-6 py-4 border-t bg-muted/30">
                    <Button type="button" onClick={() => onOpenChange(false)} className="h-9">
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
