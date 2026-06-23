import { AuthService } from './auth.service';
import { ForgotPasswordDto, LoginDto, RegisterDto, ResetPasswordDto } from './dto/auth.dto';
export declare class AuthController {
    private readonly auth;
    constructor(auth: AuthService);
    register(dto: RegisterDto): Promise<{
        success: true;
        data: {
            accessToken: string;
            user: {
                id: string;
                username: string;
                email: string;
                name: string;
            };
        };
        message: string;
    }>;
    login(dto: LoginDto): Promise<{
        success: true;
        data: {
            accessToken: string;
            user: {
                id: string;
                username: string;
                email: string;
                name: string;
            };
        };
        message: string;
    }>;
    forgotPassword(dto: ForgotPasswordDto): Promise<{
        success: true;
        data: null;
        message: string;
    }>;
    resetPassword(dto: ResetPasswordDto): Promise<{
        success: true;
        data: null;
        message: string;
    }>;
    me(req: {
        user: {
            id: string;
        };
    }): Promise<{
        success: true;
        data: {
            id: string;
            username: string;
            email: string;
            name: string;
        };
        message: string;
    }>;
}
