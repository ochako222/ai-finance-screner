export function fmtPln(n: number) {
    return `${n.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł`;
}

export function formatSignedPln(n: number) {
    const abs = Math.abs(n).toLocaleString('pl-PL', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    return `${n >= 0 ? '+' : '−'}${abs} zł`;
}
