<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class RolePermissionSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function (): void {
            $definitions = [
                'assets.view_all' => 'View all company assets.',
                'assets.view_assigned' => 'View assets assigned to the signed-in employee.',
                'assets.create' => 'Register assets.',
                'assets.update' => 'Update asset details.',
                'assets.retire' => 'Retire active assets.',
                'assignments.view_all' => 'View all asset assignment history.',
                'assignments.view_own_history' => 'View the signed-in employee’s assignment history.',
                'assignments.assign' => 'Assign assets to employees.',
                'assignments.return' => 'Close asset assignments when assets are returned.',
                'employees.view_all' => 'View employee records.',
                'employees.create' => 'Create employee accounts.',
                'employees.update' => 'Update employee records.',
                'employees.deactivate' => 'Deactivate employee accounts.',
                'tickets.view_all' => 'View all asset issue tickets.',
                'tickets.view_own' => 'View the signed-in employee’s tickets.',
                'tickets.create' => 'Create tickets for eligible assigned assets.',
                'tickets.close' => 'Close tickets.',
                'departments.manage' => 'Manage departments.',
                'locations.manage' => 'Manage locations.',
                'audit_logs.view' => 'View audit event logs.',
            ];

            $permissions = collect();

            foreach ($definitions as $code => $description) {
                $permissions->put(
                    $code,
                    Permission::updateOrCreate(
                        ['code' => $code],
                        ['description' => $description],
                    ),
                );
            }

            $assetManager = $this->upsertSystemRole(
                'asset_manager',
                'Asset Manager',
                'Built-in role for managing assets, employees, tickets, and access.',
                true,
            );

            $staffMember = $this->upsertSystemRole(
                'staff_member',
                'Staff Member',
                'Built-in role for viewing assigned assets and managing own tickets.',
                false,
            );

            $assetManager->permissions()->sync($permissions->pluck('id')->all());

            $staffCodes = [
                'assets.view_assigned',
                'assignments.view_own_history',
                'tickets.view_own',
                'tickets.create',
            ];

            $staffPermissionIds = collect($staffCodes)
                ->map(fn (string $code): int => $permissions->get($code)->id)
                ->all();

            $staffMember->permissions()->sync($staffPermissionIds);
        });
    }

    private function upsertSystemRole(
        string $slug,
        string $name,
        string $description,
        bool $mfaRequired,
    ): Role {
        $role = Role::query()->firstOrNew(['slug' => $slug]);

        $role->name = $name;
        $role->description = $description;
        $role->is_system = true;
        $role->mfa_required = $mfaRequired;
        $role->save();

        return $role;
    }
}