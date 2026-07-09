import { z } from 'zod';

export const rolePermissionSchema = z.object({
    modulePermissionId: z.string().uuid({ message: 'Invalid module permission selection' })
});

export const roleFormSchema = z.object({
    name: z
        .string()
        .min(2, { message: 'Role name must be at least 2 characters long' })
        .max(50, { message: 'Role name cannot exceed 50 characters' })
        .refine((val) => !/^\s*$/.test(val), { message: 'Role name cannot be empty spaces' }),
    description: z.string().max(250, { message: 'Description cannot exceed 250 characters' }).optional(),
    permissions: z.array(rolePermissionSchema)
});

export type TRolePermissionSchema = z.infer<typeof rolePermissionSchema>;
export type TRoleFormSchema = z.infer<typeof roleFormSchema>;
