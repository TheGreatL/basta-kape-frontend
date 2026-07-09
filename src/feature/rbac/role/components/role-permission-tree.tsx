import { Card, CardHeader, CardContent, CardDescription } from '#/components/ui/card.tsx';
import { Checkbox } from '#/components/ui/checkbox.tsx';

interface PermissionItem {
    modulePermissionId: string;
}

interface RolePermissionTreeProps {
    treeData: any[];
    currentPermissions: PermissionItem[];
    onPermissionChange?: (permissions: PermissionItem[]) => void;
    readOnly?: boolean;
}

export function RolePermissionTree({ treeData, currentPermissions, onPermissionChange, readOnly = false }: RolePermissionTreeProps) {
    const handlePermissionToggle = (checked: boolean, modulePermissionId: string) => {
        if (!onPermissionChange) return;

        const filtered = currentPermissions.filter((p) => p.modulePermissionId !== modulePermissionId);

        if (checked) {
            onPermissionChange([
                ...filtered,
                {
                    modulePermissionId
                }
            ]);
        } else {
            onPermissionChange(filtered);
        }
    };

    const isPermissionChecked = (modulePermissionId: string) => {
        return currentPermissions.some((p) => p.modulePermissionId === modulePermissionId);
    };

    const isModuleChecked = (module: any) => {
        const allPermissionIds = module.permissions.map((p: any) => p.modulePermissionId);
        return currentPermissions.some((p) => allPermissionIds.includes(p.modulePermissionId));
    };

    const handleModuleToggle = (checked: boolean, module: any) => {
        if (!onPermissionChange) return;

        if (checked) {
            const readPerm = module.permissions.find((p: any) => p.permissionName === 'read');
            if (readPerm) {
                const alreadyChecked = isPermissionChecked(readPerm.modulePermissionId);
                if (!alreadyChecked) {
                    onPermissionChange([...currentPermissions, { modulePermissionId: readPerm.modulePermissionId }]);
                }
            }
        } else {
            const allPermissionIds = module.permissions.map((p: any) => p.modulePermissionId);
            const filtered = currentPermissions.filter((p) => !allPermissionIds.includes(p.modulePermissionId));
            onPermissionChange(filtered);
        }
    };

    return (
        <div className="space-y-4">
            {treeData.map((module: any) => (
                <Card key={module.moduleId} className="border border-border/60 bg-muted/25 hover:bg-muted/40 transition-all py-4">
                    <CardHeader className="py-0 px-4 pb-2 border-b border-border/40 flex flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-2.5">
                            <Checkbox
                                id={`module-${module.moduleId}`}
                                checked={isModuleChecked(module)}
                                onCheckedChange={(val: boolean | 'indeterminate') => handleModuleToggle(!!val, module)}
                                disabled={readOnly}
                            />
                            <label
                                htmlFor={`module-${module.moduleId}`}
                                className="text-sm font-bold text-foreground/95 capitalize cursor-pointer select-none"
                            >
                                {module.moduleName}
                            </label>
                        </div>
                        <CardDescription className="text-xs hidden sm:block">Operational modules mapped to security boundaries.</CardDescription>
                    </CardHeader>
                    <CardContent className="px-4 pt-3 pb-0">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {module.permissions.map((perm: any) => {
                                const checked = isPermissionChecked(perm.modulePermissionId);

                                return (
                                    <div
                                        key={perm.permissionId}
                                        className="flex items-center justify-between p-2 rounded-lg border bg-background/50 hover:bg-background/80 transition-colors border-border/40"
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <Checkbox
                                                id={perm.permissionId}
                                                checked={checked}
                                                onCheckedChange={(val: boolean | 'indeterminate') =>
                                                    handlePermissionToggle(!!val, perm.modulePermissionId)
                                                }
                                                disabled={readOnly}
                                            />
                                            <label
                                                htmlFor={perm.permissionId}
                                                className="text-xs font-semibold capitalize cursor-pointer select-none text-foreground/90"
                                            >
                                                {perm.permissionName}
                                            </label>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
