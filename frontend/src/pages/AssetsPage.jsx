import { useEffect, useState } from 'react'
import { getAssets } from '../authApi'
import '../App.css'

export default function AssetsPage({ user, onSignOut, signingOut, error }) {
  const [assets, setAssets] = useState([])
  const [meta, setMeta] = useState(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let active = true

    setLoading(true)
    setLoadError('')

    getAssets(page)
      .then((result) => {
        if (!active) return
        setAssets(result.data)
        setMeta(result.meta)
      })
      .catch((requestError) => {
        if (active) setLoadError(requestError.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [page])

  return (
    <div className="asset-page">
      <section className="form-card">
        <h1>Asset inventory</h1>
        <p className="intro">
          Signed in as {user.first_name} {user.last_name}.
        </p>

        {error && <p className="notice error" role="alert">{error}</p>}

        <button type="button" onClick={onSignOut} disabled={signingOut}>
          {signingOut ? 'Signing out…' : 'Sign out'}
        </button>
      </section>

      <section className="form-card" aria-labelledby="assets-heading">
        <h2 id="assets-heading">Assets</h2>

        {loading ? (
          <p role="status">Loading assets…</p>
        ) : loadError ? (
          <p className="notice error" role="alert">{loadError}</p>
        ) : assets.length === 0 ? (
          <p className="hint">No assets to display.</p>
        ) : (
          <>
            <ul className="asset-list">
              {assets.map((asset) => (
                <li className="asset-item" key={asset.id}>
                  <h3>{asset.asset_tag}</h3>
                  <p>{asset.type}</p>
                  <p>
                    {[asset.manufacturer, asset.model].filter(Boolean).join(' ') || 'No make or model listed'}
                  </p>
                  <p>Status: {asset.status}</p>
                  <p>
                    Assigned to:{' '}
                    {asset.current_assignment
                      ? `${asset.current_assignment.employee.first_name} ${asset.current_assignment.employee.last_name}`
                      : 'Unassigned'}
                  </p>
                </li>
              ))}
            </ul>

            <div className="asset-pagination">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setPage((current) => current - 1)}
                disabled={loading || meta.current_page <= 1}
              >
                Previous
              </button>
              <span>
                Page {meta.current_page} of {meta.last_page}
              </span>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setPage((current) => current + 1)}
                disabled={loading || meta.current_page >= meta.last_page}
              >
                Next
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  )
}