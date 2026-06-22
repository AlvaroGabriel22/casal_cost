"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ok = ok;
exports.err = err;
function ok(data, message = 'Operation completed successfully') {
    return { success: true, data, message };
}
function err(code, message) {
    return { success: false, error: { code, message } };
}
//# sourceMappingURL=api-response.js.map