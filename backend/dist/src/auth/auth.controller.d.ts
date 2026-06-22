import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
export declare class AuthController {
    private readonly auth;
    constructor(auth: AuthService);
    register(dto: RegisterDto): unknown;
    login(dto: LoginDto): unknown;
    me(req: {
        user: {
            id: string;
        };
    }): unknown;
}
