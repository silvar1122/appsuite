<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Asset;
use App\Models\AssetAssignment;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use App\Services\AuditLogger;

class AssetAssignmentController extends Controller
{
    //add asset
    public function store(Request $request, Asset $asset, AuditLogger $auditLogger): JsonResponse
    {
        $actor = $request->user();

        if (!($actor instanceof User)) {
            abort(401);
        }

        $validated = $request->validate([
            'employee_id' => [
                'required',
                'integer',
                Rule::exists('users', 'id')->where('account_status', 'active'),
            ],
        ]);

        $assignment = DB::transaction(function () use ($asset, $validated, $actor, $auditLogger, $request) {
            $lockedAsset = Asset::query()
                ->lockForUpdate()
                ->findOrFail($asset->id);

            if ($lockedAsset->status !== 'active') {
                throw ValidationException::withMessages([
                    'asset' => 'Retired assets cannot be assigned.',
                ]);
            }

            $employee = User::query()
                ->where('account_status', 'active')
                ->lockForUpdate()
                ->findOrFail($validated['employee_id']);

            if ($lockedAsset->currentAssignment()->exists()) {
                throw ValidationException::withMessages([
                    'asset' => 'Return the current assignment before reassigning this asset.',
                ]);
            }

            $assignment = new AssetAssignment();
            $assignment->asset()->associate($lockedAsset);
            $assignment->user()->associate($employee);
            $assignment->assigned_at = now();
            $assignment->save();

            $auditLogger->assetAssigned($actor, $assignment, $request->ip());

            return $assignment;
        });

        return response()->json([
            'data' => [
                'id' => $assignment->id,
                'asset_id' => $assignment->asset_id,
                'employee_id' => $assignment->user_id,
                'assigned_at' => $assignment->assigned_at->toISOString(),
            ],
        ], 201);
    }

    //return asset
    public function close(Request $request, AssetAssignment $assignment, AuditLogger $auditLogger): JsonResponse
    {
        $actor = $request->user();

        if (!($actor instanceof User)) {
            abort(401);
        }

        $validated = $request->validate([
            'return_reason' => ['required', 'string', 'max:1000'],
        ]);

        $closedAssignment = DB::transaction(function () use ($assignment, $validated, $actor, $auditLogger, $request) {
            $lockedAsset = Asset::query()
                ->lockForUpdate()
                ->findOrFail($assignment->asset_id);

            $lockedAssignment = AssetAssignment::query()
                ->lockForUpdate()
                ->findOrFail($assignment->id);

            if ($lockedAssignment->returned_at !== null) {
                throw ValidationException::withMessages([
                    'assignment' => 'This assignment has already been closed.',
                ]);
            }

            $lockedAssignment->returned_at = now();
            $lockedAssignment->return_reason = $validated['return_reason'];
            $lockedAssignment->save();
            $auditLogger->assetReturned($actor, $lockedAssignment, $request->ip());

            return $lockedAssignment;
        });

        return response()->json([
            'data' => [
                'id' => $closedAssignment->id,
                'asset_id' => $closedAssignment->asset_id,
                'employee_id' => $closedAssignment->user_id,
                'assigned_at' => $closedAssignment->assigned_at->toISOString(),
                'returned_at' => $closedAssignment->returned_at->toISOString(),
                'return_reason' => $closedAssignment->return_reason,
            ],
        ]);
    }


    //get asset assigment history for asset
    public function forAsset(Asset $asset): JsonResponse
    {
        $assignments = $asset->assignments()
            ->with('user:id,first_name,last_name')
            ->orderByDesc('assigned_at')
            ->paginate(25);

        return response()->json([
            'data' => $assignments->getCollection()
                ->map(fn(AssetAssignment $assignment) => [
                    'id' => $assignment->id,
                    'employee' => [
                        'id' => $assignment->user->id,
                        'first_name' => $assignment->user->first_name,
                        'last_name' => $assignment->user->last_name,
                    ],
                    'assigned_at' => $assignment->assigned_at->toISOString(),
                    'returned_at' => $assignment->returned_at?->toISOString(),
                    'return_reason' => $assignment->return_reason,
                ])
                ->values(),
            'meta' => [
                'current_page' => $assignments->currentPage(),
                'last_page' => $assignments->lastPage(),
                'per_page' => $assignments->perPage(),
                'total' => $assignments->total(),
            ],
        ]);
    }

    //get asset assigment history for user
    public function mine(Request $request): JsonResponse
    {
        $employee = $request->user();

        if (!($employee instanceof User)) {
            abort(401);
        }

        $assignments = $employee->assetAssignments()
            ->with('asset:id,asset_tag,type,manufacturer,model')
            ->orderByDesc('assigned_at')
            ->paginate(25);

        return response()->json([
            'data' => $assignments->getCollection()
                ->map(fn(AssetAssignment $assignment) => [
                    'id' => $assignment->id,
                    'asset' => [
                        'id' => $assignment->asset->id,
                        'asset_tag' => $assignment->asset->asset_tag,
                        'type' => $assignment->asset->type,
                        'manufacturer' => $assignment->asset->manufacturer,
                        'model' => $assignment->asset->model,
                    ],
                    'assigned_at' => $assignment->assigned_at->toISOString(),
                    'returned_at' => $assignment->returned_at?->toISOString(),
                    'return_reason' => $assignment->return_reason,
                ])
                ->values(),
            'meta' => [
                'current_page' => $assignments->currentPage(),
                'last_page' => $assignments->lastPage(),
                'per_page' => $assignments->perPage(),
                'total' => $assignments->total(),
            ],
        ]);
    }

}