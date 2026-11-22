<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Role;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Throwable;

class EmployeeController extends Controller
{
    //
    public function store(Request $request, AuditLogger $auditLogger): JsonResponse
    {
        $actor = $request->user();

        if (!$actor instanceof User) {
            abort(401);
        }

        $validated = $request->validate([
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                Rule::unique('users', 'email'),
            ],
            'department_id' => ['nullable', 'integer', 'exists:departments,id'],
            'location_id' => ['nullable', 'integer', 'exists:locations,id'],
        ]);

        $staffRole = Role::query()
            ->where('slug', 'staff_member')
            ->firstOrFail();

        $employee = DB::transaction(function () use ($validated, $actor, $staffRole, $auditLogger, $request, ) {
            $employee = new User();
            $employee->first_name = $validated['first_name'];
            $employee->last_name = $validated['last_name'];
            $employee->email = Str::lower($validated['email']);
            $employee->department_id = $validated['department_id'] ?? null;
            $employee->location_id = $validated['location_id'] ?? null;
            $employee->password = Str::random(64);
            $employee->account_status = 'active';
            $employee->save();

            $employee->roles()->attach($staffRole->id);

            $auditLogger->employeeCreated($actor, $employee, $request->ip());

            return $employee;
        });

        // Send after commit so the link cannot arrive before the account exists.
        $setupEmailSent = false;

        try {
            $setupEmailSent = Password::sendResetLink([
                'email' => $employee->email,
            ]) === Password::RESET_LINK_SENT;
        } catch (Throwable $exception) {
            report($exception);
        }

        return response()->json([
            'data' => [
                'id' => $employee->id,
                'first_name' => $employee->first_name,
                'last_name' => $employee->last_name,
                'email' => $employee->email,
                'department_id' => $employee->department_id,
                'location_id' => $employee->location_id,
                'account_status' => $employee->account_status,
            ],
            'password_setup_email_sent' => $setupEmailSent,
        ], 201);
    }

    public function index(Request $request): JsonResponse
    {
        $manager = $request->user();

        if (!$manager instanceof User) {
            abort(401);
        }

        if (!$manager->hasPermission('employees.view_all')) {
            abort(403);
        }

        $paginator = User::query()
            ->with('roles:id,name,slug')
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->orderBy('id')
            ->paginate(25);

        return response()->json([
            'data' => $paginator->getCollection()
                ->map(fn(User $employee) => [
                    'id' => $employee->id,
                    'first_name' => $employee->first_name,
                    'last_name' => $employee->last_name,
                    'email' => $employee->email,
                    'account_status' => $employee->account_status,
                    'department_id' => $employee->department_id,
                    'location_id' => $employee->location_id,
                    'roles' => $employee->roles
                        ->map(fn(Role $role) => [
                            'id' => $role->id,
                            'name' => $role->name,
                            'slug' => $role->slug,
                        ])
                        ->values(),
                ])
                ->values(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }
}
