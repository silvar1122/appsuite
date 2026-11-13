<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Asset;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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
}