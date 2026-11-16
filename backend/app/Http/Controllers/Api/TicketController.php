<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

use App\Models\Asset;
use App\Models\Ticket;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TicketController extends Controller
{
    //
    public function store(
        Request $request,
        Asset $asset,
        AuditLogger $auditLogger,
    ): JsonResponse {
        $reporter = $request->user();

        if (!$reporter instanceof User) {
            abort(401);
        }

        $validated = $request->validate([
            'description' => ['required', 'string', 'max:2000'],
        ]);

        $ticket = DB::transaction(function () use ($asset, $reporter, $validated, $auditLogger, $request) {
            $lockedAsset = Asset::query()
                ->lockForUpdate()
                ->findOrFail($asset->id);

            if ($lockedAsset->status !== 'active') {
                throw ValidationException::withMessages([
                    'asset' => 'Tickets can only be raised for active assets.',
                ]);
            }

            $assignment = $lockedAsset->currentAssignment()
                ->where('user_id', $reporter->id)
                ->lockForUpdate()
                ->first();

            if (!$assignment) {
                abort(404);
            }

            if ($lockedAsset->tickets()->where('status', 'open')->exists()) {
                throw ValidationException::withMessages([
                    'asset' => 'There is already an open ticket for this asset.',
                ]);
            }

            $ticket = new Ticket();
            $ticket->asset()->associate($lockedAsset);
            $ticket->assignment()->associate($assignment);
            $ticket->reporter()->associate($reporter);
            $ticket->description = $validated['description'];
            $ticket->status = 'open';
            $ticket->save();

            $auditLogger->ticketCreated($reporter, $ticket, $request->ip());

            return $ticket;
        });

        return response()->json([
            'data' => [
                'id' => $ticket->id,
                'asset_id' => $ticket->asset_id,
                'description' => $ticket->description,
                'status' => $ticket->status,
                'created_at' => $ticket->created_at->toISOString(),
            ],
        ], 201);
    }


    public function close(
        Request $request,
        Ticket $ticket,
        AuditLogger $auditLogger,
    ): JsonResponse {
        $actor = $request->user();

        if (!$actor instanceof User) {
            abort(401);
        }

        $closedTicket = DB::transaction(function () use ($ticket, $actor, $auditLogger, $request, ) {
            // Lock the asset first, matching the ticket creation lock order.
            $lockedAsset = Asset::query()
                ->lockForUpdate()
                ->findOrFail($ticket->asset_id);

            $lockedTicket = Ticket::query()
                ->lockForUpdate()
                ->findOrFail($ticket->id);

            if ($lockedTicket->status !== 'open') {
                throw ValidationException::withMessages([
                    'ticket' => 'This ticket is already closed.',
                ]);
            }

            $lockedTicket->status = 'closed';
            $lockedTicket->closed_at = now();
            $lockedTicket->save();

            $auditLogger->ticketClosed(
                $actor,
                $lockedTicket,
                $request->ip(),
            );

            return $lockedTicket;
        });

        return response()->json([
            'data' => [
                'id' => $closedTicket->id,
                'asset_id' => $closedTicket->asset_id,
                'description' => $closedTicket->description,
                'status' => $closedTicket->status,
                'closed_at' => $closedTicket->closed_at->toISOString(),
            ],
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user instanceof User) {
            abort(401);
        }

        $canViewAll = $user->hasPermission('tickets.view_all');
        $canViewOwn = $user->hasPermission('tickets.view_own');

        if (!$canViewAll && !$canViewOwn) {
            abort(403);
        }

        $tickets = Ticket::query()
            ->with([
                'asset:id,asset_tag,type',
                'reporter:id,first_name,last_name',
            ]);

        if (!$canViewAll) {
            $tickets->where('reporter_user_id', $user->id);
        }

        $paginator = $tickets
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate(25);

        return response()->json([
            'data' => $paginator->getCollection()
                ->map(fn(Ticket $ticket) => [
                    'id' => $ticket->id,
                    'asset' => [
                        'id' => $ticket->asset->id,
                        'asset_tag' => $ticket->asset->asset_tag,
                        'type' => $ticket->asset->type,
                    ],
                    'reporter' => [
                        'id' => $ticket->reporter->id,
                        'first_name' => $ticket->reporter->first_name,
                        'last_name' => $ticket->reporter->last_name,
                    ],
                    'description' => $ticket->description,
                    'status' => $ticket->status,
                    'created_at' => $ticket->created_at->toISOString(),
                    'closed_at' => $ticket->closed_at?->toISOString(),
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
