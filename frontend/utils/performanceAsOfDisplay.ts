/** Display label for a performance series month key (YYYY-MM), e.g. "March 2025". */
export function formatPerformanceAsOfLabel(yyyyMm: string | null | undefined): string | null {
    if (!yyyyMm) return null;
    const [y, m] = yyyyMm.split('-').map(Number);
    if (!y || !m) return yyyyMm;
    return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
