import { useEffect, useState } from 'react'
import { getEmployees } from '../authApi'
import '../App.css'

export default function EmployeesPage({ user }) {
    const [employees, setEmployees] = useState([])
    const [meta, setMeta] = useState(null)
    const [page, setPage] = useState(1)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        let active = true

        setLoading(true)
        setError('')

        getEmployees(page)
            .then((result) => {
                if (!active) return
                setEmployees(result.data)
                setMeta(result.meta)
            })
            .catch((requestError) => {
                if (active) setError(requestError.message)
            })
            .finally(() => {
                if (active) setLoading(false)
            })

        return () => {
            active = false
        }
    }, [page])

    return (
        <section className="form-card">
            <h1>Employees</h1>
            <p className="intro">
                Signed in as {user.first_name} {user.last_name}.
            </p>

            <a className="text-link" href="/">Back to assets</a>

            {loading ? (
                <p role="status">Loading employees…</p>
            ) : error ? (
                <p className="notice error" role="alert">{error}</p>
            ) : employees.length === 0 ? (
                <p className="hint">No employees to display.</p>
            ) : (
                <>
                    <ul className="asset-list">
                        {employees.map((employee) => (
                            <li className="asset-item" key={employee.id}>
                                <h2>{employee.first_name} {employee.last_name}</h2>
                                <p>{employee.email}</p>
                                <p>Status: {employee.account_status}</p>
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