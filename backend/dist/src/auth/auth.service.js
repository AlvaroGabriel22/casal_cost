"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = require("bcrypt");
const prisma_service_1 = require("../prisma/prisma.service");
const api_response_1 = require("../common/api-response");
let AuthService = class AuthService {
    constructor(prisma, jwt) {
        this.prisma = prisma;
        this.jwt = jwt;
    }
    async register(body) {
        const exists = await this.prisma.user.findFirst({
            where: {
                OR: [{ username: body.username }, { email: body.email }],
                deletedAt: null,
            },
        });
        if (exists) {
            throw new common_1.ConflictException('Username or email already in use');
        }
        const passwordHash = await bcrypt.hash(body.password, 10);
        const user = await this.prisma.user.create({
            data: {
                name: body.name,
                username: body.username,
                email: body.email,
                passwordHash,
                financialSettings: {
                    create: {
                        baseSalary: '0',
                        salaryPaymentDay: 1,
                        defaultCurrency: 'BRL',
                    },
                },
            },
        });
        const token = await this.signToken(user.id, user.username);
        return (0, api_response_1.ok)({
            accessToken: token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                name: user.name,
            },
        }, 'Operation completed successfully');
    }
    async login(username, password) {
        const user = await this.prisma.user.findFirst({
            where: { username, deletedAt: null },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const match = await bcrypt.compare(password, user.passwordHash);
        if (!match) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const token = await this.signToken(user.id, user.username);
        return (0, api_response_1.ok)({
            accessToken: token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                name: user.name,
            },
        }, 'Operation completed successfully');
    }
    async me(userId) {
        const user = await this.prisma.user.findFirst({
            where: { id: userId, deletedAt: null },
        });
        if (!user) {
            throw new common_1.UnauthorizedException();
        }
        return (0, api_response_1.ok)({
            id: user.id,
            username: user.username,
            email: user.email,
            name: user.name,
        }, 'Operation completed successfully');
    }
    signToken(sub, username) {
        return this.jwt.signAsync({ sub, username });
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map