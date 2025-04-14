export const formatResponse = (data: any, message: string = 'Success', status: number = 200) => {
    return {
        status,
        message,
        data,
    };
};

export const handleError = (error: any, message: string = 'An error occurred', status: number = 500) => {
    return {
        status,
        message,
        error: error instanceof Error ? error.message : error,
    };
};