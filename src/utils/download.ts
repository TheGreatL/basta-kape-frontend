export function parseContentDispositionFilename(header: string | null): string | null {
    if (!header) return null;

    const utf8Match = header.match(/filename\*=UTF-8''([^;\n]+)/i);
    if (utf8Match?.[1]) {
        return decodeURIComponent(utf8Match[1]);
    }

    const match = header.match(/filename="?([^";\n]+)"?/i);
    return match?.[1] ?? null;
}

export function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
}
