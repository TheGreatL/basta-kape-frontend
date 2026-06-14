import { api } from '#/api/api.ts';
import { downloadBlob } from './download';
import { toast } from 'sonner';

export const getOrderReceipt = async (orderId: string, format: 'html' | 'text' | 'pdf' | 'json'): Promise<Response> => {
    const response = await api.get(`/orders/${orderId}/receipt?format=${format}`);
    if (!response.ok) {
        throw new Error(`Failed to retrieve receipt (status: ${response.status})`);
    }
    return response;
};

export const downloadReceiptPdf = async (orderId: string, queueNumber?: string) => {
    try {
        const response = await getOrderReceipt(orderId, 'pdf');
        const blob = await response.blob();
        const filename = queueNumber ? `receipt-q${queueNumber}.pdf` : `receipt-${orderId.slice(0, 8)}.pdf`;
        downloadBlob(blob, filename);
        toast.success('PDF Receipt downloaded successfully');
    } catch (error) {
        toast.error('Download Failed', {
            description: error instanceof Error ? error.message : 'Could not download PDF receipt.'
        });
    }
};

export const openReceiptPdf = async (orderId: string) => {
    try {
        const response = await getOrderReceipt(orderId, 'pdf');
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
    } catch (error) {
        toast.error('Open Failed', {
            description: error instanceof Error ? error.message : 'Could not open PDF receipt.'
        });
    }
};

export const printReceiptHtml = async (orderId: string) => {
    try {
        const response = await getOrderReceipt(orderId, 'html');
        const htmlText = await response.text();

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            toast.error('Blocker Alert', { description: 'Pop-up blocker is preventing print window from opening.' });
            return;
        }

        printWindow.document.write(htmlText);
        printWindow.document.close();
        printWindow.focus();

        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 300);
    } catch (error) {
        toast.error('Print Failed', {
            description: error instanceof Error ? error.message : 'Could not retrieve receipt layout.'
        });
    }
};

export const printReceiptText = async (orderId: string) => {
    try {
        const response = await getOrderReceipt(orderId, 'text');
        const plainText = await response.text();

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            toast.error('Blocker Alert', { description: 'Pop-up blocker is preventing print window from opening.' });
            return;
        }

        printWindow.document.write(`
            <html>
                <head>
                    <title>Thermal Print Preview</title>
                    <style>
                        body {
                            margin: 0;
                            padding: 10px;
                            background-color: #fff;
                        }
                        pre {
                            font-family: 'Courier New', Courier, monospace;
                            font-size: 12px;
                            line-height: 1.2;
                            white-space: pre-wrap;
                            width: 320px;
                            margin: 0 auto;
                        }
                    </style>
                </head>
                <body>
                    <pre>${plainText}</pre>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();

        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 300);
    } catch (error) {
        toast.error('Print Failed', {
            description: error instanceof Error ? error.message : 'Could not retrieve plain text receipt.'
        });
    }
};
