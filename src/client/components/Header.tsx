interface HeaderProps {
    exchangeRate: number | null;
    onSync: () => void;
    isSyncing: boolean;
}

export default function Header({ exchangeRate, onSync, isSyncing }: HeaderProps) {
    return (
        <header className="bar">
            <div className="bar__group">
                <div className="brand">
                    <span className="brand__star">✦</span>
                    <span className="brand__user">alex@screener</span>
                    <span className="brand__sep">:</span>
                    <span className="brand__path">~/portfolio</span>
                </div>
            </div>

            <div className="bar__group">
                {exchangeRate != null && (
                    <span className="mod mod--rate">
                        <span>$</span>
                        {exchangeRate.toLocaleString('pl-PL', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                        })}{' '}
                        PLN
                    </span>
                )}
                <button type="button" className="btn" onClick={onSync} disabled={isSyncing}>
                    <span>⟳</span>
                    {isSyncing ? 'Syncing…' : 'Synchronize'}
                </button>
            </div>
        </header>
    );
}
