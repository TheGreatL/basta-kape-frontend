import * as React from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Camera, Loader2 } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '#/components/ui/avatar.tsx';
import { uploadProfilePicture } from '#/api/users.api.ts';
import { getErrorMessage } from '#/utils/error-handler.ts';
import { getFileUrl } from '#/utils/helper.ts';

interface UserAvatarUploadProps {
    userId: string;
    currentPhotoUrl: string | null;
    firstName: string;
    lastName: string;
    onUploadSuccess?: (newUrl: string) => void;
    readOnly?: boolean;
}

export function UserAvatarUpload({ userId, currentPhotoUrl, firstName, lastName, onUploadSuccess, readOnly = false }: UserAvatarUploadProps) {
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);

    const uploadMutation = useMutation({
        mutationFn: (file: File) => uploadProfilePicture(userId, file),
        onSuccess: (data) => {
            toast.success('Profile picture updated successfully');
            setPreviewUrl(null);
            if (onUploadSuccess) {
                onUploadSuccess(data.url);
            }
        },
        onError: (err) => {
            toast.error('Failed to upload profile picture', {
                description: getErrorMessage(err)
            });
            setPreviewUrl(null);
        }
    });

    const handleAvatarClick = () => {
        if (readOnly || uploadMutation.isPending) return;
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validation
        const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
        if (!validTypes.includes(file.type)) {
            toast.error('Invalid file type', {
                description: 'Please upload a PNG or JPEG image.'
            });
            return;
        }

        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            toast.error('File too large', {
                description: 'Image size must be less than 5MB.'
            });
            return;
        }

        // Create temporary preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreviewUrl(reader.result as string);
        };
        reader.readAsDataURL(file);

        // Trigger upload
        uploadMutation.mutate(file);
    };

    const initials = `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase();
    const displayUrl = previewUrl || getFileUrl(currentPhotoUrl) || undefined;

    return (
        <div className="flex flex-col items-center justify-center gap-3">
            <div
                onClick={handleAvatarClick}
                className={`group relative flex size-24 shrink-0 cursor-pointer overflow-hidden rounded-full border-2 border-border/80 shadow-md transition-all duration-300 ${
                    readOnly ? 'cursor-default border-border/40' : 'hover:border-primary hover:scale-[1.02]'
                }`}
            >
                <Avatar className="size-full">
                    <AvatarImage src={displayUrl} className="object-cover" />
                    <AvatarFallback className="text-xl font-bold bg-primary/10 text-primary">{initials || 'US'}</AvatarFallback>
                </Avatar>

                {/* Hover state for editing */}
                {!readOnly && !uploadMutation.isPending && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                        <Camera className="size-5" />
                        <span className="text-xs font-bold mt-1 uppercase">Change</span>
                    </div>
                )}

                {/* Uploading indicator */}
                {uploadMutation.isPending && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
                        <Loader2 className="size-6 animate-spin text-primary-foreground" />
                    </div>
                )}
            </div>

            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/png, image/jpeg, image/jpg"
                onChange={handleFileChange}
                disabled={readOnly || uploadMutation.isPending}
            />

            {!readOnly && <span className="text-xs text-muted-foreground font-medium">PNG, JPG, JPEG (Max 5MB)</span>}
        </div>
    );
}
export default UserAvatarUpload;
