import { useEffect, useState } from 'react'
import {
    createEmployee,
    deactivateEmployee,
    getEmployees,
    updateEmployee,
} from '../authApi'
import '../App.css'

const emptyEmployeeForm = {
    first_name: '',
    last_name: '',
    email: '',
}

export default function EmployeesPage({ user }) {
    const [employees, setEmployees] = useState([])
    const [meta, setMeta] = useState(null)
    const [page, setPage] = useState(1)
    const [reloadKey, setReloadKey] = useState(0)
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState('')
    const [showCreateForm, setShowCreateForm] = useState(false)
    const [form, setForm] = useState(emptyEmployeeForm)
    const [creating, setCreating] = useState(false)
    const [createError, setCreateError] = useState('')
    const [createdMessage, setCreatedMessage] = useState('')
    const [editingEmployeeId, setEditingEmployeeId] = useState(null)
    const [editForm, setEditForm] = useState({
        first_name: '',
        last_name: '',
        email: '',
    })
    const [savingEmployee, setSavingEmployee] = useState(false)
    const [deactivatingEmployeeId, setDeactivatingEmployeeId] = useState(null)
    const [employeeActionError, setEmployeeActionError] = useState('')
    const [employeeActionMessage, setEmployeeActionMessage] = useState('')

    const canCreateEmployees = user.roles?.includes('asset_manager') ?? false

    useEffect(() => {
        let active = true

        setLoading(true)
        setLoadError('')

        getEmployees(page)
            .then((result) => {
                if (!active) return
                setEmployees(result.data)
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

    function handleFieldChange(event) {
        const { name, value } = event.target
        setForm((current) => ({ ...current, [name]: value }))
    }

    async function handleCreateEmployee(event) {
        event.preventDefault()
        setCreating(true)
        setCreateError('')
        setCreatedMessage('')

        const payload = {
            first_name: form.first_name.trim(),
            last_name: form.last_name.trim(),
            email: form.email.trim(),
        }

        try {
            const result = await createEmployee(payload)

            setCreatedMessage(
                result.passwordSetupEmailSent
                    ? `Employee ${result.employee.first_name} ${result.employee.last_name} was created. Password setup email sent.`
                    : `Employee ${result.employee.first_name} ${result.employee.last_name} was created, but the password setup email was not sent.`,
            )
            setForm(emptyEmployeeForm)
            setShowCreateForm(false)
            setPage(1)
            setReloadKey((current) => current + 1)
        } catch (requestError) {
            setCreateError(requestError.message)
        } finally {
            setCreating(false)
        }
    }

    function startEditing(employee) {
        setEditingEmployeeId(employee.id)
        setEditForm({
            first_name: employee.first_name,
            last_name: employee.last_name,
            email: employee.email,
        })
        setEmployeeActionError('')
        setEmployeeActionMessage('')
    }

    async function handleUpdateEmployee(event) {
        event.preventDefault()

        if (!editingEmployeeId) return

        setSavingEmployee(true)
        setEmployeeActionError('')
        setEmployeeActionMessage('')

        try {
            await updateEmployee(editingEmployeeId, {
                first_name: editForm.first_name.trim(),
                last_name: editForm.last_name.trim(),
                email: editForm.email.trim(),
            })

            setEmployeeActionMessage('Employee details updated.')
            setEditingEmployeeId(null)
            setReloadKey((current) => current + 1)
        } catch (requestError) {
            setEmployeeActionError(requestError.message)
        } finally {
            setSavingEmployee(false)
        }
    }

    async function handleDeactivateEmployee(employee) {
        const confirmed = window.confirm(
            `Deactivate ${employee.first_name} ${employee.last_name}?`,
        )

        if (!confirmed) return

        setDeactivatingEmployeeId(employee.id)
        setEmployeeActionError('')
        setEmployeeActionMessage('')

        try {
            await deactivateEmployee(employee.id)
            setEmployeeActionMessage(
                `${employee.first_name} ${employee.last_name} was deactivated.`,
            )
            setReloadKey((current) => current + 1)
        } catch (requestError) {
            setEmployeeActionError(requestError.message)
        } finally {
            setDeactivatingEmployeeId(null)
        }
    }

    return (
        <section className="form-card">
            <h1>Employees</h1>
            <p className="intro">
                Signed in as {user.first_name} {user.last_name}.
            </p>

            <a className="text-link" href="/">Back to assets</a>

            {createdMessage && <p className="notice" role="status">{createdMessage}</p>}
            {employeeActionMessage && (
                <p className="notice" role="status">{employeeActionMessage}</p>
            )}
            {employeeActionError && (
                <p className="notice error" role="alert">{employeeActionError}</p>
            )}

            {canCreateEmployees && (
                <button
                    type="button"
                    className="secondary-button"
                    onClick={() => {
                        setShowCreateForm((current) => !current)
                        setCreateError('')
                    }}
                >
                    {showCreateForm ? 'Close form' : 'Add employee'}
                </button>
            )}

            {showCreateForm && canCreateEmployees && (
                <form onSubmit={handleCreateEmployee}>
                    <label className="field">
                        <span>First name</span>
                        <input
                            name="first_name"
                            value={form.first_name}
                            onChange={handleFieldChange}
                            maxLength={100}
                            required
                        />
                    </label>

                    <label className="field">
                        <span>Last name</span>
                        <input
                            name="last_name"
                            value={form.last_name}
                            onChange={handleFieldChange}
                            maxLength={100}
                            required
                        />
                    </label>

                    <label className="field">
                        <span>Email address</span>
                        <input
                            type="email"
                            name="email"
                            autoComplete="email"
                            value={form.email}
                            onChange={handleFieldChange}
                            maxLength={255}
                            required
                        />
                    </label>

                    {createError && (
                        <p className="notice error" role="alert">{createError}</p>
                    )}

                    <button type="submit" disabled={creating}>
                        {creating ? 'Creating…' : 'Create employee'}
                    </button>
                </form>
            )}

            <h2>Employee list</h2>

            {loading ? (
                <p role="status">Loading employees…</p>
            ) : loadError ? (
                <p className="notice error" role="alert">{loadError}</p>
            ) : employees.length === 0 ? (
                <p className="hint">No employees to display.</p>
            ) : (
                <>
                    <ul className="asset-list">
                        {employees.map((employee) => (
                            <li className="asset-item" key={employee.id}>
                                <h3>{employee.first_name} {employee.last_name}</h3>
                                <p>{employee.email}</p>
                                <p>Status: {employee.account_status}</p>

                                {editingEmployeeId === employee.id ? (
                                    <form onSubmit={handleUpdateEmployee}>
                                        <label className="field">
                                            <span>First name</span>
                                            <input
                                                value={editForm.first_name}
                                                onChange={(event) =>
                                                    setEditForm((current) => ({
                                                        ...current,
                                                        first_name: event.target.value,
                                                    }))
                                                }
                                                maxLength={100}
                                                required
                                            />
                                        </label>

                                        <label className="field">
                                            <span>Last name</span>
                                            <input
                                                value={editForm.last_name}
                                                onChange={(event) =>
                                                    setEditForm((current) => ({
                                                        ...current,
                                                        last_name: event.target.value,
                                                    }))
                                                }
                                                maxLength={100}
                                                required
                                            />
                                        </label>

                                        <label className="field">
                                            <span>Email address</span>
                                            <input
                                                type="email"
                                                value={editForm.email}
                                                onChange={(event) =>
                                                    setEditForm((current) => ({
                                                        ...current,
                                                        email: event.target.value,
                                                    }))
                                                }
                                                maxLength={255}
                                                required
                                            />
                                        </label>

                                        <button type="submit" disabled={savingEmployee}>
                                            {savingEmployee ? 'Saving…' : 'Save changes'}
                                        </button>
                                        <button
                                            type="button"
                                            className="secondary-button"
                                            onClick={() => setEditingEmployeeId(null)}
                                            disabled={savingEmployee}
                                        >
                                            Cancel
                                        </button>
                                    </form>
                                ) : (
                                    <>
                                        <button
                                            type="button"
                                            className="secondary-button"
                                            onClick={() => startEditing(employee)}
                                        >
                                            Edit employee
                                        </button>

                                        {employee.account_status === 'active' &&
                                            Number(employee.id) !== Number(user.id) && (
                                                <button
                                                    type="button"
                                                    className="secondary-button"
                                                    onClick={() => handleDeactivateEmployee(employee)}
                                                    disabled={deactivatingEmployeeId === employee.id}
                                                >
                                                    {deactivatingEmployeeId === employee.id
                                                        ? 'Deactivating…'
                                                        : 'Deactivate employee'}
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
                            disabled={!meta || page <= 1}
                        >
                            Previous
                        </button>
                        <span>Page {meta.current_page} of {meta.last_page}</span>
                        <button
                            type="button"
                            className="secondary-button"
                            onClick={() => setPage((current) => current + 1)}
                            disabled={!meta || page >= meta.last_page}
                        >
                            Next
                        </button>
                    </div>
                </>
            )}
        </section>
    )
}