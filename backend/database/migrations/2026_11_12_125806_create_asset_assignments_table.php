<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('asset_assignments', function (Blueprint $table) {
            $table->id();

            $table->foreignId('asset_id')
                ->constrained('assets')
                ->restrictOnDelete();

            $table->foreignId('user_id')
                ->constrained('users')
                ->restrictOnDelete();

            $table->timestamp('assigned_at');
            $table->timestamp('returned_at')->nullable();
            $table->string('return_reason', 1000)->nullable();

            $table->unsignedBigInteger('open_asset_id')
                ->nullable()
                ->storedAs('IF(returned_at IS NULL, asset_id, NULL)');

            $table->unique('open_asset_id');
            $table->index(['user_id', 'assigned_at']);
            $table->index(['asset_id', 'assigned_at']);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('asset_assignments');
    }
};
