export interface IActivityLogActor {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
}

export interface IActivityLog {
    id: string;
    actorId: string;
    title: string;
    details: string;
    createdAt: string;
    actor: IActivityLogActor | null;
}

export interface IGetActivityLogsParams {
    page?: number;
    limit?: number;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
}
