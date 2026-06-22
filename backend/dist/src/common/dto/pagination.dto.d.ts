export declare class PaginationQueryDto {
    page?: number;
    limit?: number;
}
export declare function paginate(page?: number, limit?: number): {
    skip: number;
    take: any;
    page: any;
    limit: any;
};
