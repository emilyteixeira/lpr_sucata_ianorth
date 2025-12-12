
export const API_BASE_URL = import.meta.env.DEV ? 'http://127.0.0.1:8000' : '';

export const getMediaUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    
    if (API_BASE_URL === '') return cleanPath;

    const cleanBase = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
    return `${cleanBase}${cleanPath}`;
};
