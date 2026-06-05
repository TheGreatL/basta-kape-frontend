import { format } from 'date-fns';
import { Card, CardHeader, CardTitle, CardDescription } from '#/components/ui/card.tsx';
import type { IRoleListItem } from '../../rbac.types.ts';

interface RoleAuditCardProps {
    role: IRoleListItem;
}

export function RoleAuditCard({ role }: RoleAuditCardProps) {
    return (
        <Card className="mx-6">
            <CardHeader>
                <CardTitle>Audit Information</CardTitle>
                <CardDescription>
                    <p className="block">Created At: {format(new Date(role.createdAt), 'MMM dd, yyyy, hh:mm a')}</p>
                    <p className="block">Updated At: {format(new Date(role.updatedAt), 'MMM dd, yyyy, hh:mm a')}</p>
                    {role.createdBy && role.updatedBy ? (
                        <>
                            <p className="block">
                                Created By: {role.createdBy.firstName} {role.createdBy.lastName} ({role.createdBy.email})
                            </p>
                            <p className="block">
                                Updated By: {role.updatedBy.firstName} {role.updatedBy.lastName} ({role.updatedBy.email})
                            </p>
                        </>
                    ) : (
                        <p className="block">System Generated</p>
                    )}
                </CardDescription>
            </CardHeader>
        </Card>
    );
}
