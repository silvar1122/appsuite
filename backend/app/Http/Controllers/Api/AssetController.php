<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Asset;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AssetController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user instanceof User) {
            abort(401);
        }

        $canViewAll = $user->hasPermission('assets.view_all');
        $canViewAssigned = $user->hasPermission('assets.view_assigned');

        if (!$canViewAll && !$canViewAssigned) {
            abort(403);
        }

        $assets = Asset::query()
            ->with('currentAssignment.user:id,first_name,last_name');

        if (!$canViewAll) {
            $assets->whereHas(
                'currentAssignment',
                fn($query) => $query->where('user_id', $user->id),
            );
        }

        $paginator = $assets
            ->orderBy('asset_tag')
            ->paginate(25);

        return response()->json([
            'data' => $paginator->getCollection()
                ->map(fn(Asset $asset) => $this->assetData($asset))
                ->values(),
            'meta' => $this->paginationMeta($paginator),
        ]);
    }

    public function show(Request $request, Asset $asset): JsonResponse
    {
        $user = $request->user();

        if (!$user instanceof User) {
            abort(401);
        }

        $canViewAll = $user->hasPermission('assets.view_all');
        $canViewAssigned = $user->hasPermission('assets.view_assigned');

        if (!$canViewAll && !$canViewAssigned) {
            abort(403);
        }

        if (
            !$canViewAll
            && !$asset->currentAssignment()
                ->where('user_id', $user->id)
                ->exists()
        ) {
            abort(404);
        }

        $asset->loadMissing('currentAssignment.user:id,first_name,last_name');

        return response()->json([
            'data' => $this->assetData($asset),
        ]);
    }

    private function assetData(Asset $asset): array
    {
        $assignment = $asset->currentAssignment;

        return [
            'id' => $asset->id,
            'asset_tag' => $asset->asset_tag,
            'type' => $asset->type,
            'manufacturer' => $asset->manufacturer,
            'model' => $asset->model,
            'serial_number' => $asset->serial_number,
            'status' => $asset->status,
            'current_assignment' => $assignment ? [
                'employee' => [
                    'id' => $assignment->user->id,
                    'first_name' => $assignment->user->first_name,
                    'last_name' => $assignment->user->last_name,
                ],
                'assigned_at' => $assignment->assigned_at->toISOString(),
            ] : null,
        ];
    }

    private function paginationMeta(LengthAwarePaginator $paginator): array
    {
        return [
            'current_page' => $paginator->currentPage(),
            'last_page' => $paginator->lastPage(),
            'per_page' => $paginator->perPage(),
            'total' => $paginator->total(),
        ];
    }

    public function store(Request $request, AuditLogger $auditLogger): JsonResponse
    {
        $actor = $request->user();

        if (!$actor instanceof User) {
            abort(401);
        }

        $validated = $request->validate([
            'asset_tag' => ['required', 'string', 'max:50', 'unique:assets,asset_tag'],
            'type' => ['required', 'string', 'max:100'],
            'manufacturer' => ['nullable', 'string', 'max:120'],
            'model' => ['nullable', 'string', 'max:120'],
            'serial_number' => ['nullable', 'string', 'max:120', 'unique:assets,serial_number'],
        ]);

        $asset = DB::transaction(function () use ($validated, $actor, $auditLogger, $request) {
            $asset = new Asset();
            $asset->fill($validated);
            $asset->save();

            $auditLogger->assetCreated($actor, $asset, $request->ip());

            return $asset;
        });

        $asset->loadMissing('currentAssignment.user:id,first_name,last_name');

        return response()->json([
            'data' => $this->assetData($asset),
        ], 201);
    }

    public function update(
        Request $request,
        Asset $asset,
        AuditLogger $auditLogger,
    ): JsonResponse {
        $actor = $request->user();

        if (!$actor instanceof User) {
            abort(401);
        }

        $validated = $request->validate([
            'asset_tag' => [
                'sometimes',
                'required',
                'string',
                'max:50',
                Rule::unique('assets', 'asset_tag')->ignore($asset->id),
            ],
            'type' => ['sometimes', 'required', 'string', 'max:100'],
            'manufacturer' => ['sometimes', 'nullable', 'string', 'max:120'],
            'model' => ['sometimes', 'nullable', 'string', 'max:120'],
            'serial_number' => [
                'sometimes',
                'nullable',
                'string',
                'max:120',
                Rule::unique('assets', 'serial_number')->ignore($asset->id),
            ],
        ]);

        if ($validated === []) {
            throw ValidationException::withMessages([
                'asset' => 'Provide at least one field to update.',
            ]);
        }

        $updatedAsset = DB::transaction(function () use ($asset, $validated, $actor, $auditLogger, $request ) {
            $lockedAsset = Asset::query()
                ->lockForUpdate()
                ->findOrFail($asset->id);

            $lockedAsset->fill($validated);
            $changedFields = array_keys($lockedAsset->getDirty());

            if ($changedFields !== []) {
                $lockedAsset->save();

                $auditLogger->assetUpdated(
                    $actor,
                    $lockedAsset,
                    $changedFields,
                    $request->ip()
                );
            }

            return $lockedAsset;
        });

        $updatedAsset->loadMissing('currentAssignment.user:id,first_name,last_name');

        return response()->json([
            'data' => $this->assetData($updatedAsset),
        ]);
    }
}