import * as React from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Camera, Loader2, Image as ImageIcon } from 'lucide-react';
import { uploadProductPhoto } from '#/api/products.api.ts';
import { getErrorMessage } from '#/utils/error-handler.ts';
import { getFileUrl } from '#/utils/helper';

interface ProductPhotoUploadProps {
    currentPhotoUrl: string | null | undefined;
    onUploadSuccess?: (newUrl: string) => void;
    readOnly?: boolean;
}

export function ProductPhotoUpload({ currentPhotoUrl, onUploadSuccess, readOnly = false }: ProductPhotoUploadProps) {
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);

    const uploadMutation = useMutation({
        mutationFn: uploadProductPhoto,
        onSuccess: (data) => {
            toast.success('Product photo uploaded successfully');
            setPreviewUrl(null);
            if (onUploadSuccess) {
                onUploadSuccess(data.url);
            }
        },
        onError: (err) => {
            toast.error('Failed to upload product photo', {
                description: getErrorMessage(err)
            });
            setPreviewUrl(null);
        }
    });

    const handleClick = () => {
        if (readOnly || uploadMutation.isPending) return;
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validation
        const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            toast.error('Invalid file type', {
                description: 'Please upload a PNG, JPEG, JPG, or WEBP image.'
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

    const displayUrl = previewUrl || currentPhotoUrl || undefined;

    return (
        <div className="flex flex-col items-center justify-center gap-3">
            <div
                onClick={handleClick}
                className={`group relative flex size-32 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-border bg-muted shadow-sm transition-all duration-300 ${
                    readOnly ? 'cursor-default border-border/40' : 'hover:border-primary hover:scale-[1.01]'
                }`}
            >
                {displayUrl ? (
                    <img src={getFileUrl(displayUrl)} alt="Product Photo" className="size-full object-cover" />
                ) : (
                    <div className="flex flex-col size-full items-center justify-center text-muted-foreground gap-1">
                        <ImageIcon className="size-8 stroke-[1.5]" />
                        <span className="text-xs font-medium uppercase">No Photo</span>
                    </div>
                )}

                {/* Hover state for editing */}
                {!readOnly && !uploadMutation.isPending && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                        <Camera className="size-6" />
                        <span className="text-xs font-bold mt-1 uppercase">Change Photo</span>
                    </div>
                )}

                {/* Uploading indicator */}
                {uploadMutation.isPending && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
                        <Loader2 className="size-8 animate-spin text-primary-foreground" />
                    </div>
                )}
            </div>

            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/png, image/jpeg, image/jpg, image/webp"
                onChange={handleFileChange}
                disabled={readOnly || uploadMutation.isPending}
            />

            {!readOnly && <span className="text-xs text-muted-foreground font-medium">PNG, JPG, WEBP (Max 5MB)</span>}
        </div>
    );
}

export default ProductPhotoUpload;
