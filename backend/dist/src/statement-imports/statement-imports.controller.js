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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatementImportsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const current_user_decorator_1 = require("../auth/current-user.decorator");
const statement_imports_service_1 = require("./statement-imports.service");
const statement_import_dto_1 = require("./dto/statement-import.dto");
const uploadOptions = { limits: { fileSize: 5 * 1024 * 1024 } };
let StatementImportsController = class StatementImportsController {
    constructor(imports) {
        this.imports = imports;
    }
    list(user) {
        return this.imports.listImports(user.id);
    }
    entries(user, query) {
        return this.imports.listEntries(user.id, query.month, query.bank, query.sourceType);
    }
    preview(user, file, query) {
        if (!file?.buffer?.length) {
            throw new common_1.BadRequestException('Selecione um arquivo CSV ou OFX.');
        }
        return this.imports.preview(user.id, file.buffer, file.originalname, query.bank, query.sourceType);
    }
    import(user, file, query) {
        if (!file?.buffer?.length) {
            throw new common_1.BadRequestException('Selecione um arquivo CSV ou OFX.');
        }
        return this.imports.import(user.id, file.buffer, file.originalname, query.bank, query.sourceType);
    }
    delete(user, id, dto) {
        return this.imports.deleteImport(user.id, id, dto.password);
    }
};
exports.StatementImportsController = StatementImportsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], StatementImportsController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('entries'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, statement_import_dto_1.StatementImportQueryDto]),
    __metadata("design:returntype", void 0)
], StatementImportsController.prototype, "entries", null);
__decorate([
    (0, common_1.Post)('preview'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', uploadOptions)),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, typeof (_a = typeof common_1.UploadedFile !== "undefined" && common_1.UploadedFile) === "function" ? _a : Object, statement_import_dto_1.StatementBankHintDto]),
    __metadata("design:returntype", void 0)
], StatementImportsController.prototype, "preview", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', uploadOptions)),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, typeof (_b = typeof common_1.UploadedFile !== "undefined" && common_1.UploadedFile) === "function" ? _b : Object, statement_import_dto_1.StatementBankHintDto]),
    __metadata("design:returntype", void 0)
], StatementImportsController.prototype, "import", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, statement_import_dto_1.DeleteStatementImportDto]),
    __metadata("design:returntype", void 0)
], StatementImportsController.prototype, "delete", null);
exports.StatementImportsController = StatementImportsController = __decorate([
    (0, common_1.Controller)('statement-imports'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [statement_imports_service_1.StatementImportsService])
], StatementImportsController);
//# sourceMappingURL=statement-imports.controller.js.map