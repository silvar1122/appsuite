<?php

namespace App\Services;

use App\Models\AssetAssignment;
use App\Models\AuditLog;
use App\Models\User;

class AuditLogger
{
    public function assetAssigned(
        User $actor,
        AssetAssignment $assignment,
        ?string $ipAddress,
    ): void {
        $this->write(
            'asset.assigned',
            $actor,
            $assignment,
            $ipAddress,
        );
    }

    public function assetReturned(
        User $actor,
        AssetAssignment $assignment,
        ?string $ipAddress,
    ): void {
        $this->write(
            'asset.returned',
            $actor,
            $assignment,
            $ipAddress,
        );
    }

    private function write(
        string $eventType,
        User $actor,
        AssetAssignment $assignment,
        ?string $ipAddress,
    ): void {
        $log = new AuditLog();
        $log->actor_user_id = $actor->id;
        $log->event_type = $eventType;
        $log->subject_type = 'asset_assignment';
        $log->subject_id = $assignment->id;
        $log->metadata = [
            'asset_id' => $assignment->asset_id,
            'employee_id' => $assignment->user_id,
        ];
        $log->ip_address = $ipAddress;
        $log->created_at = now();
        $log->save();
    }
}