import { useEffect, useState } from 'react'
import { assignAsset, createAsset, getAssets, getEmployees } from '../authApi'
import '../App.css'

const emptyForm = {
    asset_tag: '',
    type: '',
    manufacturer: '',
    model: '',
    serial_number: '',
}

export default function AssetsPage({ user, onSignOut, signingOut, error }) {
    const [assets, setAssets] = useState([])
    const [meta, setMeta] = useState(null)
    const [page, setPage] = useState(1)
    const [reloadKey, setReloadKey] = useState(0)
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState('')
    const [showCreateForm, setShowCreateForm] = useState(false)
    const [form, setForm] = useState(emptyForm)
    const [creating, setCreating] = useState(false)
    const [createError, setCreateError] = useState('')
    const [createdMessage, setCreatedMessage] = useState('')
    const [employees, setEmployees] = useState([])
    const [assigningAssetId, setAssigningAssetId] = useState(null)
    const [selectedEmployeeId, setSelectedEmployeeId] = useState('')
    const [assigning, setAssigning] = useState(false)
    const [assignmentError, setAssignmentError] = useState('')
    const [assignedMessage, setAssignedMessage] = useState('')
    const [loadingEmployees, setLoadingEmployees] = useState(false)
    const [employeesError, setEmployeesError] = useState('')

    const canCreateAssets = user.roles?.includes('asset_manager') ?? false


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
    }, [page, reloadKey])

    useEffect(() => {
        if (!canCreateAssets) return

        let active = true
        setLoadingEmployees(true)
        setEmployeesError('')

        getEmployees(1)
            .then((result) => {
                if (!active) return

                setEmployees(
                    result.data.filter((employee) => employee.account_status === 'active'),
                )
            })
            .catch((requestError) => {
                if (active) setEmployeesError(requestError.message)
            })
            .finally(() => {
                if (active) setLoadingEmployees(false)
            })

        return () => {
            active = false
        }
    }, [canCreateAssets])

    function handleFieldChange(event) {
        const { name, value } = event.target
        setForm((current) => ({ ...current, [name]: value }))
    }

    async function handleCreateAsset(event) {
        event.preventDefault()
        setCreating(true)
        setCreateError('')
        setCreatedMessage('')

        const payload = {
            asset_tag: form.asset_tag.trim(),
            type: form.type.trim(),
            manufacturer: form.manufacturer.trim() || null,
            model: form.model.trim() || null,
            serial_number: form.serial_number.trim() || null,
        }

        try {
            const asset = await createAsset(payload)
            setForm(emptyForm)
            setShowCreateForm(false)
            setCreatedMessage(`Asset ${asset.asset_tag} was registered.`)
            setPage(1)
            setReloadKey((current) => current + 1)
        } catch (requestError) {
            setCreateError(requestError.message)
        } finally {
            setCreating(false)
        }
    }

    async function handleAssignAsset(event) {
        event.preventDefault()

        if (!assigningAssetId || !selectedEmployeeId) return

        setAssigning(true)
        setAssignmentError('')
        setAssignedMessage('')

        try {
            const assignment = await assignAsset(
                assigningAssetId,
                Number(selectedEmployeeId),
            )

            const asset = assets.find((item) => item.id === assignment.asset_id)
            const employee = employees.find(
                (item) => item.id === assignment.employee_id,
            )

            setAssignedMessage(
                `${asset?.asset_tag ?? 'Asset'} assigned to ${employee?.first_name ?? 'employee'} ${employee?.last_name ?? ''}.`,
            )
            setAssigningAssetId(null)
            setSelectedEmployeeId('')
            setReloadKey((current) => current + 1)
        } catch (requestError) {
            setAssignmentError(requestError.message)
        } finally {
            setAssigning(false)
        }
    }

    return (
        <div className="asset-page">
            <section className="form-card">
                <h1>Asset inventory</h1>
                <p className="intro">
                    Signed in as {user.first_name} {user.last_name}.
                </p>

                {error && <p className="notice error" role="alert">{error}</p>}

                {canCreateAssets && (
                    <button
                        type="button"
                        className="secondary-button"
                        onClick={() => {
                            setShowCreateForm((current) => !current)
                            setCreateError('')
                        }}
                    >
                        {showCreateForm ? 'Close form' : 'Register asset'}
                    </button>
                )}

                <button type="button" onClick={onSignOut} disabled={signingOut}>
                    {signingOut ? 'Signing out…' : 'Sign out'}
                </button>
            </section>

            {showCreateForm && canCreateAssets && (
                <section className="form-card" aria-labelledby="register-asset-heading">
                    <h2 id="register-asset-heading">Register an asset</h2>

                    <form onSubmit={handleCreateAsset}>
                        <label className="field">
                            <span>Asset tag</span>
                            <input
                                name="asset_tag"
                                value={form.asset_tag}
                                onChange={handleFieldChange}
                                maxLength={50}
                                required
                            />
                        </label>

                        <label className="field">
                            <span>Type</span>
                            <input
                                name="type"
                                value={form.type}
                                onChange={handleFieldChange}
                                maxLength={100}
                                placeholder="Laptop, monitor, phone…"
                                required
                            />
                        </label>

                        <label className="field">
                            <span>Manufacturer</span>
                            <input
                                name="manufacturer"
                                value={form.manufacturer}
                                onChange={handleFieldChange}
                                maxLength={120}
                            />
                        </label>

                        <label className="field">
                            <span>Model</span>
                            <input
                                name="model"
                                value={form.model}
                                onChange={handleFieldChange}
                                maxLength={120}
                            />
                        </label>

                        <label className="field">
                            <span>Serial number</span>
                            <input
                                name="serial_number"
                                value={form.serial_number}
                                onChange={handleFieldChange}
                                maxLength={120}
                            />
                        </label>

                        {createError && (
                            <p className="notice error" role="alert">{createError}</p>
                        )}

                        <button type="submit" disabled={creating}>
                            {creating ? 'Registering…' : 'Save asset'}
                        </button>
                    </form>
                </section>
            )}

            <section className="form-card" aria-labelledby="assets-heading">
                <h2 id="assets-heading">Assets</h2>
                {assignedMessage && <p className="notice" role="status">{assignedMessage}</p>}
                {employeesError && <p className="notice error" role="alert">{employeesError}</p>}

                {createdMessage && <p className="notice" role="status">{createdMessage}</p>}

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
                                    {canCreateAssets && asset.status === 'active' && !asset.current_assignment && (
                                        <>
                                            {assigningAssetId === asset.id ? (
                                                <form onSubmit={handleAssignAsset}>
                                                    <label className="field">
                                                        <span>Assign to employee</span>
                                                        <select
                                                            value={selectedEmployeeId}
                                                            onChange={(event) => setSelectedEmployeeId(event.target.value)}
                                                            required
                                                        >
                                                            <option value="">Choose an employee</option>
                                                            {employees.map((employee) => (
                                                                <option key={employee.id} value={employee.id}>
                                                                    {employee.first_name} {employee.last_name} ({employee.email})
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </label>

                                                    {loadingEmployees && <p className="hint">Loading employees…</p>}
                                                    {assignmentError && (
                                                        <p className="notice error" role="alert">{assignmentError}</p>
                                                    )}
                                                    {!loadingEmployees && employees.length === 0 && (
                                                        <p className="hint">No active employees are available.</p>
                                                    )}

                                                    <button type="submit" disabled={assigning || loadingEmployees || employees.length === 0}>
                                                        {assigning ? 'Assigning…' : 'Confirm assignment'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="secondary-button"
                                                        onClick={() => {
                                                            setAssigningAssetId(null)
                                                            setSelectedEmployeeId('')
                                                            setAssignmentError('')
                                                        }}
                                                        disabled={assigning}
                                                    >
                                                        Cancel
                                                    </button>
                                                </form>
                                            ) : (
                                                <button
                                                    type="button"
                                                    className="secondary-button"
                                                    onClick={() => {
                                                        setAssigningAssetId(asset.id)
                                                        setSelectedEmployeeId('')
                                                        setAssignmentError('')
                                                        setAssignedMessage('')
                                                    }}
                                                >
                                                    Assign asset
                                                </button>
                                            )}
                                        </>
                                    )}
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
                            <span>Page {meta.current_page} of {meta.last_page}</span>
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