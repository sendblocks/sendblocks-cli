export function parseError(error: any) {
    let errorMessage = error.message;
    if (error.data?.detail) {
        errorMessage += `: ${error.data.detail}`;
    }
    return errorMessage;
}
