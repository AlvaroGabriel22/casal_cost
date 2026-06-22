export type AuthUser = {
    id: string;
    username: string;
    email: string;
    name: string;
};
export declare const CurrentUser: (...dataOrPipes: unknown[]) => ParameterDecorator;
