interface HeaderProps {
    lastSync: string | null;
    onSync: () => void;
    onAdvise: () => void;
    isSyncing: boolean;
}

export default function Header({ lastSync, onSync, onAdvise, isSyncing }: HeaderProps) {
    return (
        <header className="header">
            <div className="header__brand">
                <span className="header__logo">✦</span>
                <h1>Alex Financial Screener</h1>
            </div>
            <div className="header__actions">
                {lastSync && (
                    <span className="header__sync-time">
                        Last sync: {new Date(lastSync).toLocaleString()}
                    </span>
                )}
                <button
                    type="button"
                    className="btn btn--secondary"
                    onClick={onSync}
                    disabled={isSyncing}
                >
                    {isSyncing ? 'Syncing…' : 'Synchronize'}
                </button>
                <button type="button" className="btn btn--primary" onClick={onAdvise}>
                    Advise
                </button>
            </div>
        </header>
    );
}
