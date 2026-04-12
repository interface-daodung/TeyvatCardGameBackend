import { useCallback, useRef } from 'react';

/**
 * Lưu snapshot chuỗi hóa của giá trị form để so sánh dirty (chưa lưu).
 * Dùng chung cho mọi popup chỉnh sửa: gọi setBaseline khi mở/sync form, isDirty(current) mỗi lần render.
 */
export function useUnsavedBaseline<T>() {
    const baselineSerialized = useRef<string | null>(null);

    const setBaseline = useCallback((value: T) => {
        baselineSerialized.current = JSON.stringify(value);
    }, []);

    const clearBaseline = useCallback(() => {
        baselineSerialized.current = null;
    }, []);

    const isDirty = useCallback((current: T) => {
        if (baselineSerialized.current === null) return false;
        return JSON.stringify(current) !== baselineSerialized.current;
    }, []);

    return { setBaseline, clearBaseline, isDirty };
}
