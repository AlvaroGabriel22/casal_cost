export declare function ok<T>(data: T, message?: string): {
    success: true;
    data: T;
    message: string;
};
export declare function err(code: string, message: string): {
    success: false;
    error: {
        code: string;
        message: string;
    };
};
