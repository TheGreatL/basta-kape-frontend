import { Mail, Phone, Calendar } from 'lucide-react';

interface ProfileCardProps {
    firstName: string;
    lastName: string;
    username: string;
    email: string;
    phoneNumber?: string | null;
    createdAt: string;
}

export default function ProfileCard({ firstName, lastName, username, email, phoneNumber, createdAt }: ProfileCardProps) {
    const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || 'U';

    return (
        <div className="rounded-2xl border border-border/40 bg-card p-6 text-center flex flex-col items-center">
            <div className="size-20 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl font-black mb-4">
                {initials}
            </div>
            <h2 className="text-lg font-bold text-foreground leading-tight">
                {firstName} {lastName}
            </h2>
            <span className="text-xs text-muted-foreground mt-1">@{username}</span>

            <div className="w-full border-t border-border/40 mt-6 pt-6 text-left space-y-4">
                <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
                    <Mail className="size-4 text-primary shrink-0" />
                    <span className="truncate">{email}</span>
                </div>
                {phoneNumber && (
                    <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
                        <Phone className="size-4 text-primary shrink-0" />
                        <span>{phoneNumber}</span>
                    </div>
                )}
                <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
                    <Calendar className="size-4 text-primary shrink-0" />
                    <span>Member since {new Date(createdAt).toLocaleDateString()}</span>
                </div>
            </div>
        </div>
    );
}
