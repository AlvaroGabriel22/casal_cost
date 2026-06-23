export declare class RegisterDto {
    name: string;
    username: string;
    email: string;
    password: string;
}
export declare class LoginDto {
    username: string;
    password: string;
}
export declare class ForgotPasswordDto {
    email: string;
}
export declare class ResetPasswordDto {
    token: string;
    password: string;
}
