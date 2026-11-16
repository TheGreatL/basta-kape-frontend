export function formatTime12h(timeStr: string | null | undefined): string {
    if (!timeStr) return '';
    const parts = timeStr.split(':');
    if (parts.length < 2) return timeStr;
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return timeStr;

    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    const formattedMinutes = String(minutes).padStart(2, '0');
    return `${formattedHours}:${formattedMinutes} ${ampm}`;
}

function parseMinutesFromMidnight(timeStr: string | null | undefined): number | null {
    if (!timeStr) return null;
    const parts = timeStr.split(':');
    if (parts.length < 2) return null;
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    return hours * 60 + minutes;
}

export function getStoreStatus(
    openingTime?: string | null,
    closingTime?: string | null,
    now: Date = new Date()
): {
    isOpen: boolean;
    statusText: string;
    formattedHours: string;
} {
    const openMins = parseMinutesFromMidnight(openingTime);
    const closeMins = parseMinutesFromMidnight(closingTime);

    if (openMins === null || closeMins === null) {
        return {
            isOpen: true,
            statusText: 'Welcome',
            formattedHours: 'Hours not set'
        };
    }

    const formattedOpen = formatTime12h(openingTime);
    const formattedClose = formatTime12h(closingTime);
    const formattedHours = `${formattedOpen} – ${formattedClose}`;

    const currentMins = now.getHours() * 60 + now.getMinutes();

    let isOpen = false;
    if (openMins <= closeMins) {
        isOpen = currentMins >= openMins && currentMins < closeMins;
    } else {
        // Overnight hours (e.g. 18:00 to 02:00)
        isOpen = currentMins >= openMins || currentMins < closeMins;
    }

    const statusText = isOpen ? 'Open Now' : `Closed • Opens at ${formattedOpen}`;

    return {
        isOpen,
        statusText,
        formattedHours
    };
}
