import { Card, CardHeader, CardContent, CardDescription } from '#/components/ui/card.tsx';
import { Checkbox } from '#/components/ui/checkbox.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/select.tsx';
import type { Scope } from '../../rbac.schema.ts';

interface PermissionItem {
    modulePermissionId: string;
    scope: Scope;
}

interface RolePermissionTreeProps {
    treeData: any[];
    currentPermissions: PermissionItem[];
    onPermissionChange?: (permissions: PermissionItem[]) => void;
    readOnly?: boolean;
}

export function RolePermissionTree({ treeData, currentPermissions, onPermissionChange, readOnly = false }: RolePermissionTreeProps) {
    const handlePermissionToggle = (checked: boolean, modulePermissions: { modulePermissionId: string; scope: Scope }[]) => {
        if (!onPermissionChange) return;

        const idsToFilter = modulePermissions.map((mp) => mp.modulePermissionId);
        const filtered = currentPermissions.filter((p) => !idsToFilter.includes(p.modulePermissionId));

        if (checked) {
            const defaultScope = modulePermissions.find((mp) => mp.scope === 'ALL') || modulePermissions[0];
            onPermissionChange([
                ...filtered,
                {
                    modulePermissionId: defaultScope.modulePermissionId,
                    scope: defaultScope.scope
                }
            ]);
        } else {
            onPermissionChange(filtered);
        }
    };

    const handleScopeChange = (newScope: Scope, modulePermissions: { modulePermissionId: string; scope: Scope }[]) => {
        if (!onPermissionChange) return;

        const idsToFilter = modulePermissions.map((mp) => mp.modulePermissionId);
        const filtered = currentPermissions.filter((p) => !idsToFilter.includes(p.modulePermissionId));

        const matched = modulePermissions.find((mp) => mp.scope === newScope);
        if (matched) {
            onPermissionChange([
                ...filtered,
                {
                    modulePermissionId: matched.modulePermissionId,
                    scope: matched.scope
                }
            ]);
        }
    };

    const getActiveNodeState = (modulePermissions: { modulePermissionId: string; scope: Scope }[]) => {
        const ids = modulePermissions.map((mp) => mp.modulePermissionId);
        const activeItem = currentPermissions.find((p) => ids.includes(p.modulePermissionId));
        return {
            checked: !!activeItem,
            scope: activeItem ? activeItem.scope : undefined
        };
    };

    const isModuleChecked = (module: any) => {
        const allPermissionIds = module.permissions.flatMap((p: any) => p.modulePermissions.map((mp: any) => mp.modulePermissionId));
        return currentPermissions.some((p) => allPermissionIds.includes(p.modulePermissionId));
    };

    const handleModuleToggle = (checked: boolean, module: any) => {
        if (!onPermissionChange) return;

        if (checked) {
            const readPerm = module.permissions.find((p: any) => p.permissionName === 'read');
            if (readPerm) {
                const mpOptions = readPerm.modulePermissions.map((mp: any) => ({
                    modulePermissionId: mp.modulePermissionId,
                    scope: mp.scope
                }));
                const { checked: alreadyChecked } = getActiveNodeState(mpOptions);
                if (!alreadyChecked) {
                    handlePermissionToggle(true, mpOptions);
                }
            }
        } else {
            const allPermissionIds = module.permissions.flatMap((p: any) => p.modulePermissions.map((mp: any) => mp.modulePermissionId));
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
                                const mpOptions = perm.modulePermissions.map((mp: any) => ({
                                    modulePermissionId: mp.modulePermissionId,
                                    scope: mp.scope
                                }));

                                const { checked, scope } = getActiveNodeState(mpOptions);

                                return (
                                    <div
                                        key={perm.permissionId}
                                        className="flex items-center justify-between p-2 rounded-lg border bg-background/50 hover:bg-background/80 transition-colors border-border/40"
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <Checkbox
                                                id={perm.permissionId}
                                                checked={checked}
                                                onCheckedChange={(val: boolean | 'indeterminate') => handlePermissionToggle(!!val, mpOptions)}
                                                disabled={readOnly}
                                            />
                                            <label
                                                htmlFor={perm.permissionId}
                                                className="text-xs font-semibold capitalize cursor-pointer select-none text-foreground/90"
                                            >
                                                {perm.permissionName}
                                            </label>
                                        </div>

                                        {checked && (
                                            <Select
                                                value={scope}
                                                onValueChange={(val: string) => handleScopeChange(val as Scope, mpOptions)}
                                                disabled={readOnly}
                                            >
                                                <SelectTrigger className="h-7  text-xs font-semibold border-dashed py-0">
                                                    <SelectValue placeholder="Scope" />
                                                </SelectTrigger>
                                                <SelectContent position="popper" align="end">
                                                    {mpOptions.map((opt: any) => (
                                                        <SelectItem key={opt.modulePermissionId} value={opt.scope} className="text-xs font-semibold">
                                                            Scope: {opt.scope}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
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
