import React, { useState, useMemo } from 'react';
import { FileText, File, Download, ExternalLink, ZoomIn, ZoomOut, RotateCw, Maximize2, AlertCircle, Coffee } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '#/components/ui/dialog.tsx';
import { Button } from '#/components/ui/button.tsx';
import { Badge } from '#/components/ui/badge.tsx';
import { getFileUrl } from '#/utils/helper';
import { toast } from 'sonner';

export type FileType = 'image' | 'pdf' | 'unknown';

interface FileViewerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    fileUrl: string | null | undefined;
    fileName?: string;
    title?: string;
}

export function getFileType(url: string | null | undefined, name?: string): FileType {
    if (!url && !name) return 'unknown';

    const urlLower = (url || '').toLowerCase();
    const nameLower = (name || '').toLowerCase();

    // Data / Blob URLs for PDF
    if (url?.startsWith('data:application/pdf')) return 'pdf';
    if (url?.startsWith('data:image/')) return 'image';

    // PDF checks: if URL or filename contains .pdf or pdf format parameter, return 'pdf'
    if (urlLower.includes('.pdf') || nameLower.includes('.pdf') || urlLower.includes('format=pdf') || nameLower.includes('pdf')) {
        return 'pdf';
    }

    // Image extension checks
    const imageExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'bmp', 'avif'];
    const urlClean = urlLower.split('?')[0];
    const nameClean = nameLower.split('?')[0];

    const urlExt = urlClean.includes('.') ? urlClean.split('.').pop() || '' : '';
    const nameExt = nameClean.includes('.') ? nameClean.split('.').pop() || '' : '';

    if (imageExtensions.includes(urlExt) || imageExtensions.includes(nameExt)) {
        return 'image';
    }

    // Default fallback for fileUrl (uploaded photos / proofs)
    return 'image';
}

export default function FileViewerDialog({ open, onOpenChange, fileUrl, fileName, title = 'File Preview' }: FileViewerDialogProps) {
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [imageError, setImageError] = useState(false);

    const fullUrl = useMemo(() => {
        if (!fileUrl) return '';
        if (fileUrl.startsWith('blob:') || fileUrl.startsWith('data:') || fileUrl.startsWith('http')) {
            return fileUrl;
        }
        return getFileUrl(fileUrl);
    }, [fileUrl]);

    const detectedType = useMemo(() => getFileType(fileUrl, fileName), [fileUrl, fileName]);

    const extractedFileName = useMemo(() => {
        if (fileName) return fileName;
        if (!fileUrl) return 'Attachment File';
        const parts = fileUrl.split('?')[0].split('/');
        return decodeURIComponent(parts[parts.length - 1]) || 'Attachment File';
    }, [fileName, fileUrl]);

    const fileExtension = useMemo(() => {
        if (detectedType === 'pdf') return 'PDF';
        const cleanUrl = (fileUrl || '').split('?')[0];
        let ext = cleanUrl.split('.').pop() || '';
        if (!ext || ext.length > 5 || ext.includes('/')) {
            ext = (extractedFileName || '').split('.').pop() || '';
        }
        if (!ext || ext.length > 5 || ext.includes('/')) {
            return 'IMAGE';
        }
        return ext.toUpperCase();
    }, [fileUrl, extractedFileName, detectedType]);

    // Reset view controls on file change
    React.useEffect(() => {
        if (open) {
            setZoom(1);
            setRotation(0);
            setImageError(false);
        }
    }, [open, fileUrl]);

    const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
    const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
    const handleRotate = () => setRotation((prev) => (prev + 90) % 360);
    const handleResetZoom = () => {
        setZoom(1);
        setRotation(0);
    };

    const handleDownload = async () => {
        if (!fullUrl) return;
        const downloadName = extractedFileName.includes('.') ? extractedFileName : `${extractedFileName}.${fileExtension.toLowerCase()}`;
        try {
            if (fullUrl.startsWith('blob:')) {
                const a = document.createElement('a');
                a.href = fullUrl;
                a.download = downloadName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                toast.success(`Downloading ${downloadName}`);
                return;
            }
            const response = await fetch(fullUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = downloadName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            toast.success(`Downloading ${downloadName}`);
        } catch {
            window.open(fullUrl, '_blank');
        }
    };

    const handleOpenInNewTab = () => {
        if (fullUrl) {
            window.open(fullUrl, '_blank', 'noopener,noreferrer');
        }
    };

    const renderHeaderBadge = () => {
        switch (detectedType) {
            case 'image':
                return (
                    <Badge
                        variant="secondary"
                        className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-semibold"
                    >
                        {fileExtension}
                    </Badge>
                );
            case 'pdf':
                return (
                    <Badge variant="secondary" className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 font-semibold">
                        PDF Document
                    </Badge>
                );
            default:
                return (
                    <Badge variant="outline" className="font-semibold">
                        {fileExtension}
                    </Badge>
                );
        }
    };

    const renderContent = () => {
        if (!fullUrl) {
            return (
                <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground space-y-3">
                    <AlertCircle className="size-10 text-amber-500" />
                    <p className="font-semibold text-sm">No file URL provided for preview.</p>
                </div>
            );
        }

        switch (detectedType) {
            case 'image':
                return (
                    <div className="relative flex flex-col items-center justify-center bg-zinc-950/90 rounded-2xl p-4 min-h-[380px] max-h-[70vh] overflow-auto border border-border/40 group">
                        {/* Image Controls Bar */}
                        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 bg-background/80 backdrop-blur-md p-1.5 rounded-xl border border-border/60 shadow-md opacity-90 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" onClick={handleZoomIn} className="size-8" title="Zoom In">
                                <ZoomIn className="size-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={handleZoomOut} className="size-8" title="Zoom Out">
                                <ZoomOut className="size-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={handleRotate} className="size-8" title="Rotate">
                                <RotateCw className="size-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={handleResetZoom} className="size-8 text-xs font-semibold" title="Reset View">
                                <Maximize2 className="size-4" />
                            </Button>
                        </div>

                        {!imageError ? (
                            <img
                                src={fullUrl}
                                alt={extractedFileName}
                                onError={() => setImageError(true)}
                                style={{
                                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                                    transition: 'transform 0.2s ease-in-out'
                                }}
                                className="max-h-[60vh] max-w-full object-contain rounded-lg shadow-2xl select-none"
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center p-10 text-center text-zinc-400 space-y-3">
                                <Coffee className="size-12 text-zinc-600 animate-bounce" />
                                <p className="text-sm font-semibold text-zinc-300">Failed to load image preview.</p>
                                <p className="text-xs text-zinc-500">The image URL may be expired or inaccessible.</p>
                            </div>
                        )}
                    </div>
                );

            case 'pdf':
                return (
                    <div className="flex flex-col space-y-3">
                        <div className="relative w-full h-[65vh] min-h-[480px] bg-muted/20 rounded-2xl overflow-hidden border border-border/60 shadow-inner">
                            <iframe
                                src={fullUrl.startsWith('blob:') ? fullUrl : `${fullUrl}#toolbar=1&navpanes=0`}
                                title={extractedFileName}
                                className="w-full h-full border-0"
                            />
                        </div>
                    </div>
                );

            default:
                return (
                    <div className="flex flex-col items-center justify-center p-8 sm:p-12 bg-muted/20 rounded-2xl border border-border/60 text-center space-y-6">
                        <div className="flex size-20 items-center justify-center rounded-3xl bg-primary/10 text-primary shadow-sm border border-primary/20">
                            {fileExtension === 'PDF' ? (
                                <FileText className="size-10 text-rose-600 dark:text-rose-400" />
                            ) : (
                                <File className="size-10 text-primary" />
                            )}
                        </div>

                        <div className="space-y-1.5 max-w-md">
                            <h4 className="text-base font-bold text-foreground break-all">{extractedFileName}</h4>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Document file ({fileExtension}). Click below to download or open directly in your browser.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                            <Button
                                variant="default"
                                size="sm"
                                onClick={handleDownload}
                                className="rounded-xl gap-2 h-10 font-bold shadow-md shadow-primary/20"
                            >
                                <Download className="size-4" />
                                Download File
                            </Button>

                            <Button variant="ghost" size="sm" onClick={handleOpenInNewTab} className="rounded-xl gap-2 h-10 font-medium">
                                <ExternalLink className="size-4" />
                                Open Direct
                            </Button>
                        </div>
                    </div>
                );
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className={`border-border/60 ${detectedType === 'pdf' ? 'sm:max-w-4xl' : 'sm:max-w-3xl'} max-h-[90vh] overflow-y-auto`}>
                <DialogHeader className="space-y-1 pr-6">
                    <div className="flex items-center gap-2">
                        <DialogTitle className="text-lg font-bold text-foreground">{title}</DialogTitle>
                        {renderHeaderBadge()}
                    </div>
                    <DialogDescription className="text-xs text-muted-foreground truncate max-w-lg">{extractedFileName}</DialogDescription>
                </DialogHeader>

                {/* File Render Body */}
                <div className="py-2">{renderContent()}</div>

                {/* Dialog Footer Actions */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/40">
                    <Button variant="outline" size="sm" onClick={handleOpenInNewTab} className="rounded-xl gap-1.5 text-xs h-9">
                        <ExternalLink className="size-3.5" />
                        Open Direct
                    </Button>
                    <Button variant="default" size="sm" onClick={handleDownload} className="rounded-xl gap-1.5 text-xs font-bold h-9 shadow-xs">
                        <Download className="size-3.5" />
                        Download
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
