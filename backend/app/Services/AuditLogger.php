<?php

namespace App\Services;

use App\Models\Asset;
use App\Models\AssetAssignment;
use App\Models\AuditLog;
use App\Models\User;

class AuditLogger
{
    private const ASSET_FIELDS = [
        'asset_tag',
        'type',
        'manufacturer',
        'model',
        'serial_number',
    ];

    public function assetCreated(
        User $actor,
        Asset $asset,
        ?string $ipAddress,
    ): void {
        $this->write(
            'asset.created',
            $actor,
            'asset',
            $asset->id,
            ['changed_fields' => self::ASSET_FIELDS],
            $ipAddress,
        );
    }

    public function assetUpdated(
        User $actor,
        Asset $asset,
        array $changedFields,
        ?string $ipAddress,
    ): void {
        $this->write(
            'asset.updated',
            $actor,
            'asset',
            $asset->id,
            [
                'changed_fields' => array_values(
                    array_intersect(self::ASSET_FIELDS, $changedFields),
                ),
            ],
            $ipAddress,
        );
    }

    public function assetRetired(
        User $actor,
        Asset $asset,
        ?string $ipAddress,
    ): void {
        $this->write(
            'asset.retired',
            $actor,
            'asset',
            $asset->id,
            [
                'old_status' => 'active',
                'new_status' => 'retired',
            ],
            $ipAddress,
        );
    }

    public function assetAssigned(
        User $actor,
        AssetAssignment $assignment,
        ?string $ipAddress,
    ): void {
        $this->write(
            'asset.assigned',
            $actor,
            'asset_assignment',
            $assignment->id,
            [
                'asset_id' => $assignment->asset_id,
                'employee_id' => $assignment->user_id,
            ],
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
            'asset_assignment',
            $assignment->id,
            [
                'asset_id' => $assignment->asset_id,
                'employee_id' => $assignment->user_id,
            ],
            $ipAddress,
        );
    }

    private function write(
        string $eventType,
        User $actor,
        string $subjectType,
        int $subjectId,
        array $metadata,
        ?string $ipAddress,
    ): void {
        $log = new AuditLog();
        $log->actor_user_id = $actor->id;
        $log->event_type = $eventType;
        $log->subject_type = $subjectType;
        $log->subject_id = $subjectId;
        $log->metadata = $metadata;
        $log->ip_address = $ipAddress;
        $log->created_at = now();
        $log->save();
    }
}